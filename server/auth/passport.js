const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const {User} = require('../model/schemas');
const {validatePassword, getInvalidPasswordMessage} = require('./passwordValidator');
const mongoose = require('mongoose');
const sanitise = require('mongo-sanitize');
const LOGGER = require('../../logger')('./server/passport.js');

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).exec();
        if (!user) {
            LOGGER.error('User (_id: {}) not found', id);
            return done(new Error(`User (_id: ${id}) not found`));
        }
        done(null, user);
    } catch (err) {
        LOGGER.error('Error deserializing user (_id: {})', id);
        return done(err);
    }
});

const registerOptions = {
    usernameField: 'email',
    passReqToCallback: true
};

passport.use('localRegister', new LocalStrategy(registerOptions, async (req, email, password, done) => {
    const username = sanitise(req.body.username).toLowerCase();
    const emailLowerCase = email.toLowerCase();

    let user;
    try {
        user = await User.findOne({$or: [{email: emailLowerCase}, {username}]}).exec();
    } catch (err) {
        LOGGER.error('An error occurred during user registration: {}', err);
        return done(err);
    }

    if (user) {
        if (user.email === emailLowerCase) {
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

    const newUser = new User({
        _id: new mongoose.Types.ObjectId(),
        username: username,
        email: emailLowerCase,
        password: User.generateHash(password),
        streamInfo: {
            streamKey: User.generateStreamKey()
        }
    });
    try {
        await newUser.save();
        done(null, newUser);
    } catch (err) {
        LOGGER.error('An error occurred when saving new User: {}, Error: {}', JSON.stringify(newUser), err);
        done(err)
    }
}));

const loginOptions = {
    usernameField: 'usernameOrEmail',
    passReqToCallback: true
};

passport.use('localLogin', new LocalStrategy(loginOptions, async (req, usernameOrEmail, password, done) => {
    const usernameOrEmailLowercase = usernameOrEmail.toLowerCase();
    try {
        const user = await User.findOne({$or: [{'username': usernameOrEmailLowercase}, {'email': usernameOrEmailLowercase}]})
            .select('+password')
            .exec();
        if (!(user && user.checkPassword(password))) {
            return done(null, false, req.flash('login', 'Incorrect username/email or password'));
        }
        done(null, user);
    } catch (err) {
        LOGGER.error('An error occurred during user login: {}', err);
        return done(err);
    }
}));

module.exports = passport;