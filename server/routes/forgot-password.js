const express = require('express');
const router = express.Router();
const {User, PasswordResetToken} = require('../model/schemas');
const sanitise = require('mongo-sanitize');
const {randomBytes, createHash} = require('crypto');
const moment = require('moment');
const sesEmailSender = require('../aws/sesEmailSender');
const passwordValidator = require('../auth/passwordValidator');
const loginChecker = require('connect-ensure-login');
const config = require('../../mainroom.config');
const LOGGER = require('../../logger')('./server/routes/forgot-password.js');

router.get('/', loginChecker.ensureLoggedOut(), (req, res) => {
    res.render('forgotPassword', {
        emailSent: req.query.emailSent,
        csrfToken: req.csrfToken()
    });
});

router.post('/', loginChecker.ensureLoggedOut(), (req, res, next) => {
    const email = sanitise(req.query.email);
    User.findOne({email}, '_id email username displayName', (err, user) => {
        if (err) {
            LOGGER.error('An error occurred when finding user with email {}: {}', email, err);
            next(err);
        } else if (!user) {
            res.status(404).send(`User with email ${escape(email)}) not found`);
        } else {
            randomBytes(16, (err, token) => {
                if (err) {
                    LOGGER.error('An error occurred when generating random bytes for password reset token: {}', err);
                    next(err);
                } else {
                    const passwordResetToken = new PasswordResetToken({
                        user: user._id,
                        tokenHash: hashToken(token),
                        expires: moment().add(config.storage.passwordResetToken.expiryInMinutes, 'minutes').toDate()
                    });
                    passwordResetToken.save(err => {
                        if (err) {
                            LOGGER.error('An error occurred when saving password reset token for user with email {}: {}', email, err);
                            next(err);
                        } else {
                            sesEmailSender.sendResetPasswordEmail(user, token)
                                .then(() => res.redirect('/forgot-password?emailSent=true'))
                                .catch(err => next(err));
                        }
                    });
                }
            });
        }
    });
});

router.get('/reset', loginChecker.ensureLoggedOut(), (req, res, next) => {
    const sanitisedToken = sanitise(req.query.token);
    const tokenHash = hashToken(sanitisedToken);
    PasswordResetToken.findOne({tokenHash}, (err, token) => {
        if (err) {
            LOGGER.error('An error occurred when finding password reset token: {}', err);
            next(err);
        } else {
            res.render('resetPassword', {
                passwordResetToken: token,
                errors: req.flash('errors'),
                csrfToken: req.csrfToken()
            });
        }
    });
});

router.post('/reset', loginChecker.ensureLoggedOut(), (req, res, next) => {
    const userId = sanitise(req.body.passwordResetToken.user)
    User.findById(userId).exec((err, user) => {
        if (err) {
            LOGGER.error(`An error occurred when finding user with _id {}: {}`, userId, err);
            next(err);
        } else if (!user) {
            res.status(404).send(`User (_id: ${escape(userId)}) not found`);
        } else if (!passwordValidator.validate(req.body.newPassword)) {
            flashInvalidPassword(req);
            res.redirect('/reset-password');
        } else {
            user.password = user.generateHash(req.body.newPassword);
            user.save(err => {
                if (err) {
                    LOGGER.error(`An error occurred when updating password for user with _id {}: {}`, userId, err);
                    next(err);
                } else {
                    PasswordResetToken.findByIdAndDelete(req.body.passwordResetToken._id, err => {
                        LOGGER.error('An error occurred when trying to delete PasswordResetToken (_id: {}) from database. ' +
                            'These types of objects have an expiry, so MongoDB should delete this automatically. Error: {}',
                            req.body.passwordResetToken._id, err);
                    });
                    res.redirect('/login');
                }
            });
        }
    });
});

const hashToken = token => createHash('sha256').update(token).digest('hex');

function flashInvalidPassword(req) {
    req.flash('errors', 'Invalid password. Password must contain:');

    const minLength = config.validation.password.minLength;
    const maxLength = config.validation.password.maxLength;
    req.flash('errors', `• Between ${minLength}-${maxLength} characters`);

    const minLowercase = config.validation.password.minLowercase;
    req.flash('errors', `• At least ${minLowercase} lowercase character${minLowercase > 1 ? 's' : ''}`);

    const minUppercase = config.validation.password.minUppercase;
    req.flash('errors', `• At least ${minUppercase} uppercase character${minUppercase > 1 ? 's' : ''}`);

    const minNumeric = config.validation.password.minUppercase;
    req.flash('errors', `• At least ${minNumeric} number${minNumeric > 1 ? 's' : ''}`);

    const minSpecialChars = config.validation.password.minSpecialChars;
    const allowedSpecialChars = Array.from(config.validation.password.allowedSpecialChars).join(' ');
    req.flash('errors', `• At least ${minSpecialChars} of the following special characters: ${allowedSpecialChars}`);
}

module.exports = router;