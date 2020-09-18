const express = require('express');
const router = express.Router();
const {ScheduledStream, User} = require('../database/schemas');
const loginChecker = require('connect-ensure-login');
const shortid = require('shortid');
const _ = require('lodash');
const sanitise = require('mongo-sanitize');

router.get('/all', loginChecker.ensureLoggedIn(), async (req, res) => {
    if (req.query.streamKeys) {
        const query = {
            'streamInfo.streamKey': {$in: req.query.streamKeys}
        };
        if (req.query.genre) {
            query['streamInfo.genre'] = req.query.genre;
        }
        if (req.query.category) {
            query['streamInfo.category'] = req.query.category;
        }
        const users = await User.find(query, 'username streamInfo.streamKey');
        if (users) {
            const streamInfo = users.map(user => {
                return {
                    username: user.username,
                    streamKey: user.streamInfo.streamKey
                };
            })
            res.json(streamInfo);
        }
    }
});

router.get('/search', loginChecker.ensureLoggedIn(), (req, res) => {
    if (req.query.streamKeys) {
        const sanitisedQuery = _.escapeRegExp(req.query.query);
        const searchQuery = new RegExp(`^${sanitisedQuery}$`, 'i');

        const query = {
            $and: [
                {
                    streamInfo: {
                        streamKey: {$in: req.query.streamKeys}
                    }
                },
                {$or: [{title: searchQuery}, {tags: searchQuery}, {username: searchQuery}]}
            ]
        };
        if (req.query.genre) {
            query.$and[0].streamInfo.genre = req.query.genre
        }
        if (req.query.category) {
            query.$and[0].streamInfo.category = req.query.category;
        }

        User.find(query).then(users => {
            const streamInfo = users.map(user => {
                return {
                    username: user.username,
                    streamKey: user.streamInfo.streamKey
                };
            })
            res.json(streamInfo);
        })
    }
});

router.get('/user', loginChecker.ensureLoggedIn(), (req, res) => {
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

router.post('/user', (req, res) => {
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

router.post('/user/streamKey', loginChecker.ensureLoggedIn(), (req, res) => {
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

router.post('/addToSchedule', loginChecker.ensureLoggedIn(), (req, res) => {
    const scheduledStream = new ScheduledStream({
        user: req.user._id,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        title: req.body.title,
        genre: req.body.genre,
        category: req.body.category,
        tags: req.body.tags
    });

    scheduledStream.save(err => {
        if (!err) {
            User.findOneAndUpdate({
                username: req.user.username
            }, {
                $push: {scheduledStreams: scheduledStream._id}
            }, {
                new: true
            }, (err, user) => {
                if (!err && user.scheduledStreams) {
                    res.json({
                        username: user.username,
                        scheduledStream: scheduledStream
                    })
                }
            });
        }
    });
});

module.exports = router;