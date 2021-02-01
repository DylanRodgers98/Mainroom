const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../model/schemas').User;
const shortid = require('shortid');
const {validatePassword, getInvalidPasswordMessage} = require('./passwordValidator');
const mongoose = require('mongoose');
const sanitise = require('mongo-sanitize');
const LOGGER = require('../../logger')('./server/passport.js');

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
            LOGGER.error('Error deserializing user (_id: {})', id);
            return done(err);
        }
        if (!user) {
            LOGGER.error('User (_id: {}) not found', id);
            return done(new Error(`User (_id: ${id}) not found`));
        }
        done(null, user);
    });
});

passport.use('localRegister', new LocalStrategy(strategyOptions, (req, email, password, done) => {
    const username = sanitise(req.body.username);
    User.findOne({$or: [{email}, {username}]}, (err, user) => {
        if (err) {
            LOGGER.error('An error occurred during user registration: {}', err);
            return done(err);
        }
        if (user) {
            if (user.email === email) {
                req.flash('email', 'Email is already taken');
            }
            if (user.username === username) {
                req.flash('username', 'Username is already taken');
            }
            return done(null, false);
        }
        if (!validatePassword(password)) {
            getInvalidPasswordMessage().forEach(line => req.flash('password', line))
            return done(null, false);
        }
        if (password !== req.body.confirmPassword) {
            req.flash('confirmPassword', 'Passwords do not match');
            return done(null, false);
        }

        const newUser = new User();
        newUser._id = new mongoose.Types.ObjectId();
        newUser.username = username;
        newUser.email = email;
        newUser.password = newUser.generateHash(password);
        newUser.streamInfo.streamKey = shortid.generate();
        newUser.save(err => {
            if (err) {
                LOGGER.error('An error occurred when saving new User: {}, Error: {}', JSON.stringify(newUser), err);
                return done(err)
            }
        });
        done(null, newUser);
    });
}));

passport.use('localLogin', new LocalStrategy(strategyOptions, (req, email, password, done) => {
    User.findOne({'email': email}).select('+password').exec((err, user) => {
        if (err) {
            LOGGER.error('An error occurred during user login: {}', err);
            return done(err);
        }
        if (!(user && user.checkPassword(password))) {
            return done(null, false, req.flash('login', 'Incorrect email or password'));
        }
        done(null, user);
    });
}));

module.exports = passport;