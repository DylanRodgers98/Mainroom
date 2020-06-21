const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../database/schema').User;
const shortid = require('shortid');

const strategyOptions = {
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
};

passport.serializeUser((user, cb) => {
    cb(null, user);
});

passport.deserializeUser((obj, cb) => {
    cb(null, obj);
});

passport.use('localRegister', new LocalStrategy(strategyOptions, (req, email, password, done) => {
    User.findOne({$or: [{email: email}, {username: req.body.username}]}, (err, user) => {
        if (err) {
            return done(err);
        }
        if (user) {
            if (user.email === email) {
                req.flash('email', 'Email is already taken');
            }
            if (user.username === req.body.username) {
                req.flash('username', 'Username is already taken');
            }
            return done(null, false);
        } else {
            const user = new User();
            user.username = req.body.username;
            user.email = email;
            user.password = user.generateHash(password);
            user.stream_key = shortid.generate();
            user.stream_title = null;
            user.stream_genre = null;
            user.stream_tags = [];
            user.subscribers = [];
            user.subscriptions = [];
            user.save((err) => {
                if (err) {
                    throw err;
                }
                return done(null, user);
            });
        }
    });
}));

passport.use('localLogin', new LocalStrategy(strategyOptions, (req, email, password, done) => {
    User.findOne({'email': email}, (err, user) => {
        if (err) {
            return done(err);
        }
        if (!user) {
            return done(null, false, req.flash('email', 'Email doesn\'t exist.'));
        }
        if (!user.validPassword(password)) {
            return done(null, false, req.flash('password', 'Oops! Wrong password.'));
        }
        return done(null, user);
    });
}));

module.exports = passport;