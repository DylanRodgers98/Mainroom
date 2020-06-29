const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const path = require('path');
const Session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('./auth/passport');
const mongoose = require('mongoose');
const loginChecker = require('connect-ensure-login');
const FileStore = require('session-file-store')(Session);
const config = require('./config/default');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const nodeMediaServer = require('./mediaServer');
const thumbnailGenerator = require('./cron/thumbnails');
const LOGGER = require('node-media-server/node_core_logger');

mongoose.connect('mongodb://127.0.0.1/mainroom' , { useNewUrlParser: true });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './views'));
app.use(express.static('public'));
app.use('/thumbnails', express.static('server/thumbnails'));
app.use(flash());

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json({extended: true}));

app.use(Session({
    store: new FileStore({
        path : 'server/sessions'
    }),
    secret: config.server.secret,
    maxAge : Date.now + (60 * 1000 * 30),
    resave : true,
    saveUninitialized : false,
}));

app.use(passport.initialize());
app.use(passport.session());

// Register app routes
app.use('/login', require('./routes/login'));
app.use('/register', require('./routes/register'));
app.use('/settings', require('./routes/settings'));
app.use('/streams', require('./routes/streams'));
app.use('/user', require('./routes/user'));

app.get('/logout', (req, res) => {
    req.logout();
    return res.redirect('/login');
});

app.get('*', loginChecker.ensureLoggedIn(), (req, res) => {
    res.render('index');
});

// Set up stream chat rooms
io.on("connection", socket => {
    const { id } = socket.client;
    LOGGER.log(`User connected: ${id}`);

    socket.on("chat message", ({streamUsername, viewerUsername, msg}) => {
        LOGGER.log(`[${streamUsername} Chat] ${viewerUsername} (${id}): ${msg}`);
        io.emit(`chat message ${streamUsername}`, {viewerUsername, msg});
    });
});

// Start server
server.listen(config.server.port, () => {
    LOGGER.log(`App listening on ${config.server.port}!`)
});
nodeMediaServer.run();
thumbnailGenerator.start();