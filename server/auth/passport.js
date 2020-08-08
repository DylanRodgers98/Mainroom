const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../database/schema').User;
const Stream = require('../database/schema').Stream;
const shortid = require('shortid');
const passwordValidator = require('./passwordValidator');
const config = require('../../mainroom.config');
const LOGGER = require('node-media-server/node_core_logger');

const strategyOptions = {
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
};

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        if (err) {
            LOGGER.error(`Error deserializing user (_id: ${id})`);
            throw err;
        }
        done(null, user);
    });
});

passport.use('localRegister', new LocalStrategy(strategyOptions, (req, email, password, done) => {
    if (!passwordValidator.validate(password)) {
        return done(null, false, flashInvalidPassword(req));
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

            // TODO: either do the below save operations transactionally or condense User and Stream schemas into one
            user.save((err) => {
                if (err) {
                    LOGGER.error('An error occurred when saving new user:', JSON.stringify(user), '\n', 'Error:', err);
                    throw err;
                }
            });
            stream.save((err) => {
                if (err) {
                    LOGGER.error('An error occurred when saving new stream info:', JSON.stringify(stream), '\n', 'Error:', err);
                    throw err;
                }
            })

            return done(null, user);
        }
    });
}));

function flashInvalidPassword(req) {
    req.flash('password', 'Invalid password. Password must contain:');

    const minLength = config.validation.password.minLength;
    const maxLength = config.validation.password.maxLength;
    req.flash('password', `• Between ${minLength}-${maxLength} characters`);

    const minLowercase = config.validation.password.minLowercase;
    req.flash('password', `• At least ${minLowercase} lowercase character${minLowercase > 1 ? 's' : ''}`);

    const minUppercase = config.validation.password.minUppercase;
    req.flash('password', `• At least ${minUppercase} uppercase character${minUppercase > 1 ? 's' : ''}`);

    const minNumeric = config.validation.password.minUppercase;
    req.flash('password', `• At least ${minNumeric} number${minNumeric > 1 ? 's' : ''}`);

    const minSpecialChars = config.validation.password.minSpecialChars;
    const allowedSpecialChars = Array.from(config.validation.password.allowedSpecialChars).join(' ');
    req.flash('password', `• At least ${minSpecialChars} of the following special characters: ${allowedSpecialChars}`);
}

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