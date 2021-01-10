require('dotenv').config();

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
const rateLimit = require("express-rate-limit");
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

// if in prod, app will be behind Nginx reverse proxy, so tell express to trust proxy
app.set('trust proxy', process.env.NODE_ENV === 'production');

// apply rate limiter to all requests
app.use(rateLimit({
    windowMs: config.rateLimiter.windowMs,
    max: config.rateLimiter.maxRequests
}));

// Register app routes
app.use('/login', require('./routes/login'));
app.use('/register', require('./routes/register'));
app.use('/forgot-password', require('./routes/forgot-password'));
app.use('/api/filters', require('./routes/filters'));
app.use('/api/users', require('./routes/users'));
app.use('/api/livestreams', require('./routes/livestreams'));
app.use('/api/scheduled-streams', require('./routes/scheduled-streams'));
app.use('/api/recorded-streams', require('./routes/recorded-streams'));

app.get('/logged-in-user', (req, res) => {
    res.json(!req.user ? {} : {
        _id: req.user._id,
        username: req.user.username
    });
});

app.get('/logout', (req, res) => {
    req.logout();
    return res.redirect('/');
});

app.get('*', (req, res) => {
    res.cookie('XSRF-TOKEN', req.csrfToken())
    res.render('index');
});

// Set up stream chat rooms
io.on('connection', socket => {
    socket.on('chatMessage', ({streamUsername, viewerUsername, msg}) => {
        io.emit(`chatMessage_${streamUsername}`, {viewerUsername, msg});
    });
});

// Start server
httpServer.listen(process.env.SERVER_HTTP_PORT, () => {
    LOGGER.info('{} HTTP server listening on port: {}', config.siteTitle, process.env.SERVER_HTTP_PORT);
});
nodeMediaServer.run();
cronJobs.startAll();