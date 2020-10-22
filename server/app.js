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
const awsResourceProvisioner = require('./aws/resourceProvisioner');
const LOGGER = require('../logger')('./server/app.js');

awsResourceProvisioner.provisionResources();

mongoose.connect(config.database.uri, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    useCreateIndex: true
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './views'));
app.use(express.static('public'));
app.use(flash());

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json({extended: true}));
app.use(csrf({cookie: true}))

app.use(Session({
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
    cookie: { maxAge: config.storage.session.maxAge },
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

// Register app routes
app.use('/login', require('./routes/login'));
app.use('/register', require('./routes/register'));
app.use('/auth', require('./routes/auth'));
app.use('/api/filters', require('./routes/filters'));
app.use('/api/users', require('./routes/users'));
app.use('/api/livestreams', require('./routes/livestreams'));
app.use('/api/scheduled-streams', require('./routes/scheduled-streams'));

app.get('/logout', (req, res) => {
    req.logout();
    return res.redirect('/');
});

app.get('*', (req, res) => {
    res.cookie('XSRF-TOKEN', req.csrfToken())
    res.render('index');
});

// Set up stream chat rooms
io.origins('*:*');
io.on('connection', socket => {
    socket.on('chatMessage', ({streamUsername, viewerUsername, msg}) => {
        io.emit(`chatMessage_${streamUsername}`, {viewerUsername, msg});
    });
});

// Start server
httpServer.listen(config.server.http.port || 8080, () => {
    LOGGER.info('{} HTTP server listening on port: {}', config.siteTitle, config.server.http.port || 8080);
});
nodeMediaServer.run();
cronJobs.startAll();