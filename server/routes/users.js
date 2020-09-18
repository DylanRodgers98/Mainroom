const express = require('express');
const router = express.Router();
const User = require('../database/schemas').User;
const loginChecker = require('connect-ensure-login');
const sanitise = require('mongo-sanitize');
const shortid = require('shortid');

router.get('/logged-in', loginChecker.ensureLoggedIn(), (req, res) => {
    res.json({username: req.user.username});
});

router.get('/', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOne({username: sanitise(req.query.username) || req.user.username})
        .populate({
            path: 'scheduledStreams',
            match: {
                endTime: {$gte: req.query.scheduleStartTime},
                startTime: {$lte: req.query.scheduleEndTime}
            }
        })
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

router.get('/stream-info', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOne({username: sanitise(req.query.username) || req.user.username}, (err, user) => {
        if (!err && user.streamInfo) {
            res.json({
                streamKey: user.streamInfo.streamKey,
                title: user.streamInfo.title,
                genre: user.streamInfo.genre,
                category: user.streamInfo.category,
                tags: user.streamInfo.tags
            });
        }
    });
});

router.post('/stream-info', (req, res) => {
    User.findOneAndUpdate({
        username: req.user.username
    }, {
        'streamInfo.title': sanitise(req.body.title),
        'streamInfo.genre': sanitise(req.body.genre),
        'streamInfo.category': sanitise(req.body.category),
        'streamInfo.tags': sanitise(req.body.tags)
    }, {
        new: true,
    }, (err, user) => {
        if (!err && user.streamInfo) {
            res.json({
                title: user.streamInfo.title,
                genre: user.streamInfo.genre,
                category: user.streamInfo.category,
                tags: user.streamInfo.tags
            });
        }
    });
});

router.post('/stream-key', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOneAndUpdate({
        username: req.user.username
    }, {
        'streamInfo.streamKey': shortid.generate()
    }, {
        new: true
    }, (err, user) => {
        if (!err && user.streamInfo) {
            res.json({
                streamKey: user.streamInfo.streamKey
            })
        }
    });
});

router.get('/schedule', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOne({username: req.user.username}, 'username scheduledStreams subscriptions')
        .populate({
            path: 'scheduledStreams',
            select: 'title startTime endTime',
            match: {
                endTime: {$gte: req.query.scheduleStartTime},
                startTime: {$lte: req.query.scheduleEndTime}
            }
        })
        .populate({
            path: 'subscriptions',
            select: 'username scheduledStreams.title scheduledStreams.startTime scheduledStreams.endTime',
            match: {
                'scheduledStreams.endTime': {$gte: req.query.scheduleStartTime},
                'scheduledStreams.startTime': {$lte: req.query.scheduleEndTime}
            }
        })
        .exec((err, user) => {
            if (!err && user) {
                res.json(user);
            }
        });
});

//TODO: create get route for profile pic
// router.get('/profilePic', (req, res) => {
//     res.sendFile();
// });

module.exports = router;