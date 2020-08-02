const express = require('express');
const router = express.Router();
const User = require('../database/schema').User;
const loginChecker = require('connect-ensure-login');

router.get('/loggedIn', loginChecker.ensureLoggedIn(), (req, res) => {
    res.json({username: req.user.username});
});

router.get('/', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOne({username: req.query.username}, (err, user) => {
        if (!err && user) {
            res.json({
                username: user.username,
                location: user.location,
                bio: user.bio,
                numOfSubscribers: user.subscriptions.length,
                schedule: user.schedule
            });
        }
    });
});

router.get('/subscriptions', loginChecker.ensureLoggedIn(), (req, res) => {
    const username = req.query.username ? req.query.username : req.user.username;
    User.findOne({username: username}, (err, user) => {
        if (!err) {
            res.json({
                subscriptions: user.subscriptions
            });
        }
    });
});

router.get('/schedule', loginChecker.ensureLoggedIn(), (req, res) => {
    const username = req.query.username ? req.query.username : req.user.username;
    User.findOne({username: username}, (err, user) => {
        if (!err) {
            res.json({
                username: user.username,
                schedule: user.schedule
            });
        }
    });
});

//TODO: create get route for profile pic
// router.get('/profilePic', (req, res) => {
//     res.sendFile();
// });

module.exports = router;