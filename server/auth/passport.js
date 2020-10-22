const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../model/schemas').User;
const shortid = require('shortid');
const passwordValidator = require('./passwordValidator');
const mongoose = require('mongoose');
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
    if (!passwordValidator.validate(password)) {
        const message = passwordValidator.getInvalidPasswordMessage();
        return done(null, false, message.forEach(line => req.flash('password', line)));
    }
    if (password !== req.body.confirmPassword) {
        return done(null, false, req.flash('confirmPassword', 'Passwords do not match'));
    }
    User.findOne({$or: [{email: email}, {username: req.body.username}]}, (err, user) => {
        if (err) {
            LOGGER.error('An error occurred during user registration: {}', err);
            return done(err);
        }
        if (user) {
            if (user.email === email) {
                req.flash('email', 'Email is already taken');
            }
            if (user.username === req.body.username) {
                req.flash('username', 'Username is already taken');
            }
            done(null, false);
        } else {
            const user = new User();
            user._id = new mongoose.Types.ObjectId();
            user.username = req.body.username;
            user.email = email;
            user.password = user.generateHash(password);
            user.streamInfo.streamKey = shortid.generate();
            user.save(err => {
                if (err) {
                    LOGGER.error('An error occurred when saving new User: {}, Error: {}', JSON.stringify(user), err);
                    return done(err)
                }
            });
            done(null, user);
        }
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