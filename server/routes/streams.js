const express = require('express');
const router = express.Router();
const User = require('../database/schemas').User;
const loginChecker = require('connect-ensure-login');
const shortid = require('shortid');

router.get('/all', loginChecker.ensureLoggedIn(), (req, res) => {
    if (req.query.streamKeys) {
        const query = {
            streamInfo: {
                streamKey: {$in: req.query.streamKeys}
            }
        };

        if (req.query.genre) {
            query.streamInfo.genre = req.query.genre;
        }
        if (req.query.category) {
            query.streamInfo.category = req.query.category;
        }

        User.find(query).then(users => {
            if (users) {
                const streamInfo = users.map(user => {
                    return {
                        username: user.username,
                        streamKey: user.streamInfo.streamKey
                    };
                })
                res.json(streamInfo);
            }
        });
    }
});

router.get('/search', loginChecker.ensureLoggedIn(), (req, res) => {
    if (req.query.streamKeys) {
        const searchQuery = new RegExp(`^${req.query.query}$`, 'i');

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

router.get('/', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOne({username: req.query.username || req.user.username}, (err, user) => {
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

router.post('/', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOneAndUpdate({
        username: req.user.username
    }, {
        'streamInfo.title': req.body.title,
        'streamInfo.genre': req.body.genre,
        'streamInfo.category': req.body.category,
        'streamInfo.tags': req.body.tags
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

router.post('/streamKey', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOneAndUpdate({
        username: req.user.username
    }, {
        'streamInfo.streamKey': shortid.generate()
    }, {
        new: true,
    }, (err, user) => {
        if (!err && user.streamInfo) {
            res.json({
                streamKey: user.streamInfo.streamKey
            })
        }
    });
});

module.exports = router;