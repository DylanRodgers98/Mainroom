const express = require('express');
const router = express.Router();
const config = require('../../mainroom.config');
const loginChecker = require('connect-ensure-login');
const passwordValidator = require('../auth/passwordValidator');
const User = require('../database/schemas').User;
const sanitise = require('mongo-sanitize');

router.get('/', loginChecker.ensureLoggedIn(), (req, res, next) => {
    User.findOne({username: req.user.username}, 'username email').exec((err, user) => {
        if (err) {
            next(err);
        } else if (!user) {
            res.status(404).send(`User (username: ${req.user.username}) not found`);
        } else {
            res.json({
                username: user.username,
                email: user.email
            });
        }
    });
});

router.post('/', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const findQuery = {$or: []};
    const updateQuery = {};

    if (req.body.username) {
        const username = sanitise(req.body.username);
        findQuery.$or.push({username: username});
        updateQuery.username = username;
    }
    if (req.body.email) {
        const email = sanitise(req.body.email);
        findQuery.$or.push({email: email});
        updateQuery.email = email;
    }

    if (findQuery.$or.length) {
        User.find(findQuery, 'username email', (err, users) => {
            if (err) {
                next(err);
            } else if (users) {
                const invalidReasons = {};
                for (const user of users) {
                    if (user.email === req.body.email) {
                        invalidReasons.emailInvalidReason = 'Email is already taken';
                    }
                    if (user.username === req.body.username) {
                        invalidReasons.usernameInvalidReason = 'Username is already taken';
                    }
                }
                if (invalidReasons.emailInvalidReason || invalidReasons.usernameInvalidReason) {
                    res.json(invalidReasons);
                } else {
                    User.findByIdAndUpdate(req.user._id, updateQuery, (err, user) => {
                        if (err) {
                            next(err);
                        } else if (!user) {
                            res.status(404).send(`User (username: ${req.user.username}) not found`);
                        } else {
                            res.sendStatus(200);
                        }
                    });
                }
            }
        });
    }
});

router.post('/password', loginChecker.ensureLoggedIn(), (req, res, next) => {
    User.findById(req.user._id).select('+password').exec((err, user) => {
        if (err) {
            next(err);
        } else if (!user) {
            res.status(404).send(`User (_id: ${req.user._id}) not found`);
        } else {
            if (!user.checkPassword(req.body.currentPassword)) {
                res.json({
                    currentPasswordInvalidReason: 'Password incorrect'
                });
            } else if (user.checkPassword(req.body.newPassword)) {
                res.json({
                    newPasswordInvalidReason: 'New password cannot be the same as current password'
                });
            } else if (!passwordValidator.validate(req.body.newPassword)) {
                res.json({
                    newPasswordInvalidReason: getNewPasswordInvalidReason()
                });
            } else if (req.body.newPassword !== req.body.confirmNewPassword) {
                res.json({
                    confirmNewPasswordInvalidReason: 'Passwords do not match'
                });
            } else {
                user.password = user.generateHash(req.body.newPassword);
                user.save(err => {
                    if (err) {
                        next(err);
                    } else {
                        res.sendStatus(200);
                    }
                });
            }
        }
    });
});

function getNewPasswordInvalidReason() {
    const lines = ['Invalid password. Password must contain:'];

    const minLength = config.validation.password.minLength;
    const maxLength = config.validation.password.maxLength;
    lines.push(`• Between ${minLength}-${maxLength} characters`);

    const minLowercase = config.validation.password.minLowercase;
    lines.push(`• At least ${minLowercase} lowercase character${minLowercase > 1 ? 's' : ''}`);

    const minUppercase = config.validation.password.minUppercase;
    lines.push(`• At least ${minUppercase} uppercase character${minUppercase > 1 ? 's' : ''}`);

    const minNumeric = config.validation.password.minUppercase;
    lines.push(`• At least ${minNumeric} number${minNumeric > 1 ? 's' : ''}`);

    const minSpecialChars = config.validation.password.minSpecialChars;
    const allowedSpecialChars = Array.from(config.validation.password.allowedSpecialChars).join(' ');
    lines.push(`• At least ${minSpecialChars} of the following special characters: ${allowedSpecialChars}`);

    return lines;
}

module.exports = router;