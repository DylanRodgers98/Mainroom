// load env vars from .env file if in development mode
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer);
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
const mainroomEventEmitter = require('./mainroomEventEmitter');
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
            'streamInfo.viewCount': {$gt: 0}
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

// set XSRF-TOKEN cookie for all requests to the below routes
app.use((req, res, next) => {
    res.cookie('XSRF-TOKEN', req.csrfToken());
    next();
});

/**
 * The following routes all point to the index view, which renders the React SPA,
 * but the purpose of the separate server side routes is to dynamically set open
 * graph meta tags for each page.
 */

app.get('/genre/:genre', (req, res) => {
    res.render('index', {
        title: `${req.params.genre} Livestreams - ${config.siteName}`
    });
});

app.get('/category/:category', (req, res) => {
    res.render('index', {
        title: `${req.params.category} Livestreams - ${config.siteName}`
    });
});

app.get('/search/:query', (req, res) => {
    res.render('index', {
        title: `${req.params.query} - ${config.siteName}`
    });
});

app.get('/user/:username', async (req, res) => {
    const username = sanitise(req.params.username.toLowerCase());
    let title;
    try {
        const user = await User.findOne({username: username}, 'displayName');
        title = `${user.displayName || username} - ${config.siteName}`
    } catch (err) {
        title = config.headTitle;
    }
    res.render('index', {title});
});

app.get('/user/:username/subscribers', async (req, res) => {
    const username = sanitise(req.params.username.toLowerCase());
    let title;
    try {
        const user = await User.findOne({username: username}, 'displayName');
        title = `${user.displayName || username}'s Subscribers - ${config.siteName}`
    } catch (err) {
        title = config.headTitle;
    }
    res.render('index', {title});
});

app.get('/user/:username/subscriptions', async (req, res) => {
    const username = sanitise(req.params.username.toLowerCase());
    let title;
    try {
        const user = await User.findOne({username: username}, 'displayName');
        title = `${user.displayName || username}'s Subscriptions - ${config.siteName}`
    } catch (err) {
        title = config.headTitle;
    }
    res.render('index', {title});
});

app.get('/user/:username/live', async (req, res) => {
    const username = sanitise(req.params.username.toLowerCase());
    let title;
    try {
        const user = await User.findOne({username: username}, 'displayName streamInfo.title');
        title = [(user.displayName || username), user.streamInfo.title, config.siteName].filter(Boolean).join(' - ');
    } catch (err) {
        title = config.headTitle;
    }
    res.render('index', {title});
});

app.get('/stream/:streamId', async (req, res) => {
    const streamId = sanitise(req.params.streamId);
    let title;
    try {
        const stream = await RecordedStream.findById(streamId)
            .select('user title')
            .populate({
                path: 'user',
                select: 'username displayName'
            })
            .exec();
        title = [(stream.user.displayName || stream.user.username), stream.title, config.siteName].filter(Boolean).join(' - ');
    } catch (err) {
        title = config.headTitle;
    }
    res.render('index', {title});
});

app.get('/manage-recorded-streams', (req, res) => {
    res.render('index', {
        title: `Manage Recorded Streams - ${config.siteName}`
    });
});

app.get('/schedule', (req, res) => {
    res.render('index', {
        title: `Schedule - ${config.siteName}`
    });
});

app.get('/settings', (req, res) => {
    res.render('index', {
        title: `Settings - ${config.siteName}`
    });
});

app.get('/go-live', (req, res) => {
    res.render('index', {
        title: `Stream Settings - ${config.siteName}`
    });
});

app.get('*', (req, res) => {
    res.render('index', {
        title: config.headTitle
    });
});

// Set up socket.io
io.on('connection', (socket, next) => {
    // if connection is from live stream page
    if (socket.request._query.liveStreamUsername) {
        const streamUsername = sanitise(socket.request._query.liveStreamUsername.toLowerCase());

        // increment view count on connection
        incrementViewCount(streamUsername, 1, next);

        // decrement view count on disconnection
        socket.on('disconnect', () => {
            incrementViewCount(streamUsername, -1, next);
        });

        // emit livestream chat message to correct channel
        socket.on(`onSendChatMessage`, ({viewerUser, msg}) => {
            io.emit(`onReceiveChatMessage_${streamUsername}`, {viewerUser, msg});
        });

        mainroomEventEmitter.on(`onWentLive_${streamUsername}`, () => {
            io.emit(`onWentLive_${streamUsername}`);
        });

        mainroomEventEmitter.on(`onStreamEnded_${streamUsername}`, () => {
            io.emit(`onStreamEnded_${streamUsername}`);
        });
    }
});

// TODO: CREATE USER CONTROLLER FILE AND MOVE THIS FUNCTION TO THAT
function incrementViewCount(username, increment, next) {
    const $inc = {'streamInfo.viewCount': increment}
    if (increment > 0) {
        $inc['streamInfo.cumulativeViewCount'] = increment;
    }
    User.findOneAndUpdate({username}, {$inc}, {new: true}, (err, user) => {
        if (err) {
            LOGGER.error(`An error occurred when updating user {}'s live stream view count: {}`, username, err);
            next(err);
        } else if (!user) {
            LOGGER.error('User (username: {}) not found', username, err);
            next(new Error(`User (username: ${username}) not found`));
        } else {
            io.emit(`liveStreamViewCount_${username}`, user.streamInfo.viewCount);
        }
    });
}

// Start server
httpServer.listen(process.env.SERVER_HTTP_PORT, () => {
    LOGGER.info('{} HTTP server listening on port: {}', config.siteName, process.env.SERVER_HTTP_PORT);
});
nodeMediaServer.run();

// start cron jobs only in primary pm2 app (which should only contain 1 instance)
// or on non-production environment
if (process.env.PM2_APP_NAME === 'primary' || process.env.NODE_ENV !== 'production') {
    cronJobs.startAll();
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