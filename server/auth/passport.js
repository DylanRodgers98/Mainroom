const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../database/schema').User;
const Stream = require('../database/schema').Stream;
const shortid = require('shortid');
const passwordValidator = require('../validation/passwordValidator');
const config = require('../../mainroom.config');
const LOGGER = require('node-media-server/node_core_logger');

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
    if (!passwordValidator.validate(password)) {
        req.flash('password', 'Invalid password. Password must contain:');
        req.flash('password', `• Between ${config.validation.password.minLength}-${config.validation.password.maxLength} characters`);
        req.flash('password', `• At least ${config.validation.password.minLowercase} lowercase character(s)`);
        req.flash('password', `• At least ${config.validation.password.minUppercase} uppercase character(s)`);
        req.flash('password', `• At least ${config.validation.password.minNumeric} number(s)`);
        req.flash('password', `• At least ${config.validation.password.minSpecialChar} special character(s)`);
        return done(null, false);
    }
    if (password !== req.body.confirmPassword) {
        return done(null, false, req.flash('confirmPassword', 'Passwords do not match'));
    }
    User.findOne({$or: [{email: email}, {username: req.body.username}]}, (err, user) => {
        if (err) {
            LOGGER.error('An error occurred during user registration: ', err);
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
            user.subscribers = [];
            user.subscriptions = [];
            user.schedule = [];

            const stream = new Stream();
            stream.username = req.body.username;
            stream.streamKey = shortid.generate();
            stream.title = null;
            stream.genre = null;
            stream.category = null;
            stream.tags = [];

            user.save((err) => {
                if (err) {
                    LOGGER.error('An error occurred when saving new user:', user, '\n', 'Error:', err);
                    throw err;
                }
            });
            stream.save((err) => {
                if (err) {
                    LOGGER.error('An error occurred when saving new stream info:', stream, '\n', 'Error:', err);
                    throw err;
                }
            })

            return done(null, user);
        }
    });
}));

passport.use('localLogin', new LocalStrategy(strategyOptions, (req, email, password, done) => {
    User.findOne({'email': email}, (err, user) => {
        if (err) {
            LOGGER.error('An error occurred during user login: ', err);
            return done(err);
        }
        if (!(user && user.checkPassword(password))) {
            return done(null, false, req.flash('login', 'Incorrect email or password'));
        }
        return done(null, user);
    });
}));

module.exports = passport;