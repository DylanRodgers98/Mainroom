const express = require('express');
const router = express.Router();
const User = require('../database/schemas').User;
const loginChecker = require('connect-ensure-login');
const sanitise = require('mongo-sanitize');

router.get('/loggedIn', loginChecker.ensureLoggedIn(), (req, res) => {
    res.json({username: req.user.username});
});

router.get('/', loginChecker.ensureLoggedIn(), (req, res) => {
    const populateArgs = {path: 'scheduledStreams'};
    const match = {};
    if (req.query.scheduleStartTime) {
        match.startTime = {$gte: req.query.scheduleStartTime};
    }
    if (req.query.scheduleEndTime) {
        match.endTime = {$lte: req.query.scheduleEndTime};
    }
    if (match !== {}) {
        populateArgs.match = match;
    }

    User.findOne({username: sanitise(req.query.username) || req.user.username})
        .populate(populateArgs)
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

router.get('/subscribers', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOne({username: sanitise(req.query.username) || req.user.username})
        .populate({
            path: 'subscribers',
            select: 'username'
        })
        .exec((err, user) => {
            if (!err && user) {
                res.json({
                    subscribers: user.subscribers
                });
            }
        });
});

router.get('/subscriptions', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOne({username: sanitise(req.query.username) || req.user.username})
        .populate({
            path: 'subscriptions',
            select: 'username'
        })
        .exec((err, user) => {
            if (!err && user) {
                res.json({
                    subscriptions: user.subscriptions
                });
            }
        });
});

router.get('/subscribedTo', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOne({username: sanitise(req.query.otherUsername)}, (err, otherUser) => {
        if (!err && otherUser) {
            res.send(otherUser.subscriptions.includes(req.user._id));
        }
    });
});

router.post('/subscribe', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOneAndUpdate({
        username: sanitise(req.body.userToSubscribeTo)
    }, {
        $addToSet: {subscribers: req.user._id}
    }, (err, userToSubscribeTo) => {
        if (err || !userToSubscribeTo) {
            res.sendStatus(500);
        } else {
            User.findByIdAndUpdate(req.user._id, {
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
        username: sanitise(req.body.userToUnsubscribeFrom)
    }, {
        $pull: {subscribers: req.user._id}
    }, (err, userToUnsubscribeFrom) => {
        if (err || !userToUnsubscribeFrom) {
            res.sendStatus(500);
        } else {
            User.findByIdAndUpdate(req.user._id, {
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