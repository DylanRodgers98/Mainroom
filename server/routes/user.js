const express = require('express');
const router = express.Router();
const User = require('../database/schemas').User;
const loginChecker = require('connect-ensure-login');

router.get('/loggedIn', loginChecker.ensureLoggedIn(), (req, res) => {
    res.json({username: req.user.username});
});

router.get('/', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOne({username: req.query.username})
        .populate('scheduledStreams')
        .exec((err, user) => {
            if (!err && user) {
                res.json({
                    username: user.username,
                    location: user.location,
                    bio: user.bio,
                    numOfSubscribers: user.subscribers.length,
                    scheduledStreams: user.scheduledStreams
                });
            }
        });
});

router.get('/subscriptions', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOne({username: req.query.username || req.user.username})
        .populate('subscriptions')
        .exec((err, user) => {
            if (!err && user) {
                res.json({
                    subscriptions: user.subscriptions
                });
            }
        });
});

router.get('/subscribedTo', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOne({username: req.query.otherUsername}, (err, otherUser) => {
        if (!err && otherUser) {
            res.send(otherUser.subscriptions.includes(req.user._id));
        }
    });
});

router.post('/subscribe', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOneAndUpdate({
        username: req.body.userToSubscribeTo
    }, {
        $addToSet: {subscribers: req.user._id}
    }, (err, userToSubscribeTo) => {
        if (err || !userToSubscribeTo) {
            res.sendStatus(500);
        } else {
            User.findByIdAndUpdate({
                username: req.user._id
            }, {
                $addToSet: {subscriptions: userToSubscribeTo._id}
            }, (err, user) => {
                if (err || !user) {
                    res.sendStatus(500);
                } else {
                    res.sendStatus(200);
                }
            });
        }
    });
});

router.post('/unsubscribe', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOneAndUpdate({
        username: req.body.userToUnsubscribeFrom
    }, {
        $pull: {subscribers: req.user._id}
    }, (err, userToUnsubscribeFrom) => {
        if (err || !userToUnsubscribeFrom) {
            res.sendStatus(500);
        } else {
            User.findByIdAndUpdate({
                username: req.user._id
            }, {
                $pull: {subscriptions: userToUnsubscribeFrom._id}
            }, (err, user) => {
                if (err || !user) {
                    res.sendStatus(500);
                } else {
                    res.sendStatus(200);
                }
            });
        }
    });
});

//TODO: create get route for profile pic
// router.get('/profilePic', (req, res) => {
//     res.sendFile();
// });

module.exports = router;