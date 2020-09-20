const express = require('express');
const router = express.Router();
const User = require('../database/schemas').User;
const loginChecker = require('connect-ensure-login');
const sanitise = require('mongo-sanitize');
const escape = require('escape-html');
const shortid = require('shortid');

router.get('/logged-in', loginChecker.ensureLoggedIn(), (req, res) => {
    res.json({username: req.user.username});
});

router.get('/', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const username = sanitise(req.query.username) || req.user.username;
    User.findOne({username: username},
        'username displayName location bio links subscribers scheduledStreams')
        .populate({
            path: 'scheduledStreams',
            select: 'title startTime endTime',
            match: {
                endTime: {$gte: req.query.scheduleStartTime},
                startTime: {$lte: req.query.scheduleEndTime}
            }
        })
        .exec((err, user) => {
            if (err) {
                next(err);
            } else if (!user) {
                res.status(404).send(`User (username: ${escape(username)}) not found`);
            } else {
                res.json({
                    username: user.username,
                    displayName: user.displayName,
                    location: user.location,
                    bio: user.bio,
                    links: user.links,
                    numOfSubscribers: user.subscribers.length,
                    scheduledStreams: user.scheduledStreams
                });
            }
        });
});

router.post('/', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const updateQuery = {};

    if (req.body.displayName) {
        updateQuery.displayName = sanitise(req.body.displayName);
    }
    if (req.body.location) {
        updateQuery.location = sanitise(req.body.location);
    }
    if (req.body.bio) {
        updateQuery.bio = sanitise(req.body.bio);
    }
    if (req.body.links && Array.isArray(req.body.links)) {
        updateQuery.links = sanitise(req.body.links);
    }

    User.findOneAndUpdate({username: req.user.username}, updateQuery, (err, user) => {
        if (err) {
            next(err);
        } else if (!user) {
            res.status(404).send(`User (username: ${req.user.username}) not found`);
        } else {
            res.sendStatus(200);
        }
    })
});

router.get('/subscribers', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const username = sanitise(req.query.username) || req.user.username;
    User.findOne({username: username}, 'subscribers')
        .populate({
            path: 'subscribers',
            select: 'username'
        })
        .exec((err, user) => {
            if (err) {
                next(err);
            } else if (!user) {
                res.status(404).send(`User (username: ${escape(username)}) not found`);
            } else {
                res.json({
                    subscribers: user.subscribers
                });
            }
        });
});

router.get('/subscriptions', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const username = sanitise(req.query.username) || req.user.username;
    User.findOne({username: username}, 'subscriptions')
        .populate({
            path: 'subscriptions',
            select: 'username'
        })
        .exec((err, user) => {
            if (err) {
                next(err);
            } else if (!user) {
                res.status(404).send(`User (username: ${escape(username)}) not found`);
            } else {
                res.json({
                    subscriptions: user.subscriptions
                });
            }
        });
});

router.get('/subscribed-to', loginChecker.ensureLoggedIn(), (req, res, next) => {
    User.findOne({username: sanitise(req.query.otherUsername)}, 'subscribers', (err, otherUser) => {
        if (err) {
            next(err);
        } else if (!otherUser) {
            res.status(404).send(`User (username: ${escape(req.query.otherUsername)}) not found`);
        } else {
            res.send(otherUser.subscribers.includes(req.user._id));
        }
    });
});

router.post('/subscribe', loginChecker.ensureLoggedIn(), (req, res, next) => {
    User.findOneAndUpdate({
        username: sanitise(req.body.userToSubscribeTo)
    }, {
        $addToSet: {subscribers: req.user._id}
    }, (err, userToSubscribeTo) => {
        if (err) {
            next(err);
        } else if (!userToSubscribeTo) {
            res.status(404).send(`User (username: ${escape(req.body.userToSubscribeTo)}) not found`);
        } else {
            User.findByIdAndUpdate(req.user._id, {
                $addToSet: {subscriptions: userToSubscribeTo._id}
            }, (err, user) => {
                if (err) {
                    next(err);
                } else if (!user) {
                    res.status(404).send(`User (_id: ${req.user._id}) not found`);
                } else {
                    res.sendStatus(200);
                }
            });
        }
    });
});

router.post('/unsubscribe', loginChecker.ensureLoggedIn(), (req, res, next) => {
    User.findOneAndUpdate({
        username: sanitise(req.body.userToUnsubscribeFrom)
    }, {
        $pull: {subscribers: req.user._id}
    }, (err, userToUnsubscribeFrom) => {
        if (err) {
            next(err);
        } else if (!userToUnsubscribeFrom) {
            res.status(404).send(`User (username: ${escape(req.body.userToUnsubscribeFrom)}) not found`);
        } else {
            User.findByIdAndUpdate(req.user._id, {
                $pull: {subscriptions: userToUnsubscribeFrom._id}
            }, (err, user) => {
                if (err) {
                    next(err);
                } else if (!user) {
                    res.status(404).send(`User (_id: ${req.user._id}) not found`);
                } else {
                    res.sendStatus(200);
                }
            });
        }
    });
});

router.get('/stream-info', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const username = sanitise(req.query.username) || req.user.username;
    User.findOne({username: username},
        'displayName streamInfo.streamKey streamInfo.title streamInfo.genre streamInfo.category streamInfo.tags',
        (err, user) => {
            if (err) {
                next(err);
            } else if (!user) {
                res.status(404).send(`User (username: ${escape(username)}) not found`);
            } else {
                res.json({
                    displayName: user.displayName,
                    streamKey: user.streamInfo.streamKey,
                    title: user.streamInfo.title,
                    genre: user.streamInfo.genre,
                    category: user.streamInfo.category,
                    tags: user.streamInfo.tags
                });
            }
        });
});

router.post('/stream-info', (req, res, next) => {
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
        if (err) {
            next(err);
        } else if (!user) {
            res.status(404).send(`User (username: ${req.user.username}) not found`);
        } else {
            res.json({
                title: user.streamInfo.title,
                genre: user.streamInfo.genre,
                category: user.streamInfo.category,
                tags: user.streamInfo.tags
            });
        }
    });
});

router.post('/stream-key', loginChecker.ensureLoggedIn(), (req, res, next) => {
    User.findOneAndUpdate({
        username: req.user.username
    }, {
        'streamInfo.streamKey': shortid.generate()
    }, {
        new: true
    }, (err, user) => {
        if (err) {
            next(err);
        } else if (!user) {
            res.status(404).send(`User (username: ${req.user.username}) not found`);
        } else {
            res.json({
                streamKey: user.streamInfo.streamKey
            });
        }
    });
});

router.get('/schedule', loginChecker.ensureLoggedIn(), (req, res, next) => {
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
            if (err) {
                next(err);
            } else if (!user) {
                res.status(404).send(`User (username: ${req.user.username}) not found`);
            } else {
                res.json(user);
            }
        });
});

module.exports = router;