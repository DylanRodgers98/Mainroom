// load env vars from .env file if in development mode
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const Session = require('express-session');
const MongoStore = require('connect-mongo')(Session);
const bodyParser = require('body-parser');
const passport = require('./auth/passport');
const mongoose = require('mongoose');
const config = require('../mainroom.config');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const nodeMediaServer = require('./mediaServer');
const cronJobs = require('./cron/cronJobs');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const {User, RecordedStream} = require('./model/schemas');
const sanitise = require('mongo-sanitize');
const {getThumbnail} = require('./aws/s3ThumbnailGenerator');
const axios = require('axios');
const {startWebSocketServer} = require('./websocketServer');
const {setXSRFTokenCookie} = require('./middleware/setXSRFTokenCookie');
const LOGGER = require('../logger')('./server/app.js');

// connect to database
const databaseUri = 'mongodb://'
    + (process.env.DB_USER && process.env.DB_PASSWORD ? `${process.env.DB_USER}:${process.env.DB_PASSWORD}@` : '')
    + `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

mongoose.connect(databaseUri, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    useCreateIndex: true
}, err => {
    if (err) {
        LOGGER.error(`An error occurred when connecting to MongoDB database '{}': {}`, process.env.DB_DATABASE, err);
        throw err;
    } else {
        LOGGER.info('Connected to MongoDB database: {}', process.env.DB_DATABASE);
        // Reset user's view count properties, as they may still be non-zero due to a non-graceful server shutdown
        User.updateMany({
            'streamInfo.viewCount': {$ne: 0}
        }, {
            'streamInfo.viewCount': 0,
            'streamInfo.cumulativeViewCount': 0
        }, (err, res) => {
            if (err) {
                LOGGER.error(`An error occurred when resetting users' viewCount and cumulativeViewCount properties to 0: {}`, err);
                throw err;
            }
            if (res.nModified > 0) {
                LOGGER.info('Reset viewCount and cumulativeViewCount properties for {} users', res.nModified);
            }
        });
    }
});

// set up views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './views'));
app.use(express.static('public'));
app.use(flash());

// set up cookies and CSRF token
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json({extended: true}));
app.use(csrf({cookie: true}))

// store session data in MongoDB
app.use(Session({
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: false,
}));

// set up Passport for authentication
app.use(passport.initialize());
app.use(passport.session());

// apply rate limiter to all requests
app.use(rateLimit({
    windowMs: config.rateLimiter.windowMs,
    max: config.rateLimiter.maxRequests
}));

// Register app routes
app.use('/login', require('./routes/login'));
app.use('/register', require('./routes/register'));
app.use('/forgot-password', require('./routes/forgot-password'));
app.use('/api/users', require('./routes/users'));
app.use('/api/livestreams', require('./routes/livestreams'));
app.use('/api/scheduled-streams', require('./routes/scheduled-streams'));
app.use('/api/recorded-streams', require('./routes/recorded-streams'));

app.get('/api/logged-in-user', (req, res) => {
    res.json(!req.user ? {} : {
        _id: req.user._id,
        username: req.user.username,
        displayName: req.user.displayName,
        profilePicURL: req.user.profilePicURL,
        chatColour: req.user.chatColour
    });
});

app.get('/logout', (req, res) => {
    req.logout();
    return res.redirect('/');
});

/**
 * The following routes all point to the index view, which renders the React SPA,
 * but the purpose of the separate server side routes is to dynamically set open
 * graph meta tags for each page.
 */

app.get('/genre/:genre', setXSRFTokenCookie, (req, res) => {
    res.render('index', {
        siteName: config.siteName,
        title: `${req.params.genre} Livestreams - ${config.siteName}`
    });
});

app.get('/category/:category', setXSRFTokenCookie, (req, res) => {
    res.render('index', {
        siteName: config.siteName,
        title: `${req.params.category} Livestreams - ${config.siteName}`
    });
});

app.get('/search/:query', setXSRFTokenCookie, (req, res) => {
    res.render('index', {
        siteName: config.siteName,
        title: `${req.params.query} - ${config.siteName}`
    });
});

app.get('/user/:username', setXSRFTokenCookie, async (req, res) => {
    const siteName = config.siteName;
    let title;
    let description;
    try {
        const username = sanitise(req.params.username.toLowerCase());
        const user = await User.findOne({username: username}).select('displayName bio').exec();
        title = `${user.displayName || username} - ${config.siteName}`
        description = user.bio;
    } catch (err) {
        title = config.headTitle;
    }
    res.render('index', {siteName, title, description});
});

app.get('/user/:username/subscribers', setXSRFTokenCookie, async (req, res) => {
    const siteName = config.siteName;
    let title;
    try {
        const username = sanitise(req.params.username.toLowerCase());
        const user = await User.findOne({username: username}).select('displayName').exec();
        title = `${user.displayName || username}'s Subscribers - ${config.siteName}`
    } catch (err) {
        title = config.headTitle;
    }
    res.render('index', {siteName, title});
});

app.get('/user/:username/subscriptions', setXSRFTokenCookie, async (req, res) => {
    const siteName = config.siteName;
    let title;
    try {
        const username = sanitise(req.params.username.toLowerCase());
        const user = await User.findOne({username: username}).select( 'displayName').exec();
        title = `${user.displayName || username}'s Subscriptions - ${config.siteName}`
    } catch (err) {
        title = config.headTitle;
    }
    res.render('index', {siteName, title});
});

app.get('/user/:username/live', setXSRFTokenCookie, async (req, res) => {
    const siteName = config.siteName;
    let title;
    let description;
    let imageURL;
    let imageAlt;
    let videoURL;
    let videoMimeType;
    let twitterCard;
    try {
        // TODO: this practically matches '/:username/stream-info' users API route, so extract into controller method and call here and in API route
        const username = sanitise(req.params.username.toLowerCase());
        const user = await User.findOne({username})
            .select( 'displayName streamInfo.title streamInfo.streamKey streamInfo.genre streamInfo.category')
            .exec();
        const streamKey = user.streamInfo.streamKey;
        const {data} = await axios.get(`http://${process.env.RTMP_SERVER_HOST}:${process.env.RTMP_SERVER_HTTP_PORT}/api/streams/live/${streamKey}`);
        if (data.isLive) {
            title = [(user.displayName || username), user.streamInfo.title, config.siteName].filter(Boolean).join(' - ');
            description = `${user.streamInfo.genre ? `${user.streamInfo.genre} ` : ''}${user.streamInfo.category || ''}`;
            try {
                imageURL = await getThumbnail(streamKey);
            } catch (err) {
                LOGGER.info('An error occurred when getting thumbnail for stream (stream key: {}). Returning default thumbnail. Error: {}', streamKey, err);
                imageURL = config.defaultThumbnailURL;
            }
            imageAlt = `${username} Stream Thumbnail`;
            videoURL = `http://${process.env.RTMP_SERVER_HOST}:${process.env.RTMP_SERVER_HTTP_PORT}/${process.env.RTMP_SERVER_APP_NAME}/${streamKey}/index.m3u8`;
            videoMimeType = 'application/x-mpegURL';
            twitterCard = 'player';
        } else {
            title = config.headTitle;
        }
    } catch (err) {
        title = config.headTitle;
    }
    res.render('index', {siteName, title, description, imageURL, imageAlt, videoURL, videoMimeType, twitterCard});
});

app.get('/stream/:streamId', setXSRFTokenCookie, async (req, res) => {
    const siteName = config.siteName;
    let title;
    let description;
    let imageURL;
    let imageAlt;
    let videoURL;
    let videoMimeType;
    let twitterCard;
    try {
        const streamId = sanitise(req.params.streamId);
        const stream = await RecordedStream.findById(streamId)
            .select('user title genre category videoURL thumbnailURL')
            .populate({
                path: 'user',
                select: 'username displayName'
            })
            .exec();
        title = [(stream.user.displayName || stream.user.username), stream.title, config.siteName].filter(Boolean).join(' - ');
        description = `${stream.genre ? `${stream.genre} ` : ''}${stream.category || ''}`;
        imageURL = stream.thumbnailURL || config.defaultThumbnailURL;
        imageAlt = `${stream.user.username} Stream Thumbnail`;
        videoURL = stream.videoURL;
        videoMimeType = 'video/mp4';
        twitterCard = 'player';
    } catch (err) {
        title = config.headTitle;
    }
    res.render('index', {siteName, title, description, imageURL, imageAlt, videoURL, videoMimeType, twitterCard});
});

app.get('/manage-recorded-streams', setXSRFTokenCookie, (req, res) => {
    res.render('index', {
        siteName: config.siteName,
        title: `Manage Recorded Streams - ${config.siteName}`
    });
});

app.get('/schedule', setXSRFTokenCookie, (req, res) => {
    res.render('index', {
        siteName: config.siteName,
        title: `Schedule - ${config.siteName}`
    });
});

app.get('/settings', setXSRFTokenCookie, (req, res) => {
    res.render('index', {
        siteName: config.siteName,
        title: `Settings - ${config.siteName}`
    });
});

app.get('/go-live', setXSRFTokenCookie, (req, res) => {
    res.render('index', {
        siteName: config.siteName,
        title: `Stream Settings - ${config.siteName}`
    });
});

app.get('*', setXSRFTokenCookie, (req, res) => {
    res.render('index', {
        siteName: config.siteName,
        title: config.headTitle
    });
});

// Start HTTP and WebSocket server
const httpServer = http.createServer(app).listen(process.env.SERVER_HTTP_PORT, async () => {
    LOGGER.info('{} HTTP server listening on port: {}', config.siteName, httpServer.address().port);
    await startWebSocketServer(httpServer, () => {
        LOGGER.info('{} WebSocket server listening on port: {}', config.siteName, httpServer.address().port);
    });
});

// Start cron jobs only in first pm2 instance of mainroom app, or on non-production environment
if ((process.env.PM2_APP_NAME === 'mainroom' && process.env.NODE_APP_INSTANCE === '0')
    || process.env.NODE_ENV !== 'production') {
    cronJobs.startAll();
}

// Start RTMP server only in rtmpServer pm2 app (which should only contain 1 instance) or on non-production environment
if (process.env.PM2_APP_NAME === 'rtmpServer' || process.env.NODE_ENV !== 'production') {
    nodeMediaServer.run();
}


// On application shutdown, then disconnect from database and close servers
process.on('SIGINT', async () => {
    LOGGER.info('Gracefully shutting down application...');
    try {
        LOGGER.debug('Disconnecting from database');
        await mongoose.disconnect();
        LOGGER.info('Disconnected from database');

        LOGGER.debug('Closing servers');
        nodeMediaServer.stop();
        await closeServer();
        LOGGER.info('Servers closed');

        LOGGER.info('Application shut down successfully. Exiting process with exit code 0');
        process.exit(0);
    } catch (err) {
        LOGGER.error('An error occurred during application shutdown. Exiting process with exit code 1. Error: {}', err);
        process.exit(1);
    }
});

function closeServer() {
    return new Promise((resolve, reject) => {
        httpServer.close(err => {
            if (err) {
                LOGGER.error('An error occurred when closing HTTP server: {}', err);
                reject(err);
            } else {
                resolve();
            }
        });
    });
}
