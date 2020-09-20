const express = require('express');
const router = express.Router();
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
    const username = sanitise(req.body.username);
    const email = sanitise(req.body.email);

    if (username && email) {
        User.findOne({$or: [{username: username, email: email}]}, (err, user) => {
            if (err) {
                next(err);
            } else if (user) {
                if (user.email === req.body.email) {

                }
                if (user.username === req.body.username) {

                }
                //return
            } else {
                User.findByIdAndUpdate(req.user._id, {username: username, email: email}, (err, user) => {
                    if (err) {
                        next(err);
                    } else if (!user) {
                        res.status(404).send(`User (username: ${req.user.username}) not found`);
                    } else {
                        res.sendStatus(200);
                    }
                });
            }
        });
    }
});

router.post('/password', loginChecker.ensureLoggedIn(), (req, res, next) => {
    User.findById(req.user._id).select('+password').exec((err, user) => {
        if (err) {
            next(err);
        } else if (!user) {

        } else {
            if (user.password !== req.body.currentPassword) {

            } else if (!passwordValidator.validate(req.body.newPassword)) {

            } else if (req.body.newPassword !== req.body.confirmNewPassword) {

            }
            user.password = req.body.newPassword;
            user.save(err => {
                if (err) {
                    next(err);
                } else {

                }
            });
        }
    });
});

module.exports = router;