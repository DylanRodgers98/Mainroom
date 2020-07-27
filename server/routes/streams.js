const express = require('express');
const router = express.Router();
const Stream = require('../database/schema').Stream;
const loginChecker = require('connect-ensure-login');

router.get('/all', loginChecker.ensureLoggedIn(), (req, res) => {
    if (req.query.streamKeys) {
        const query = {streamKey: {$in: req.query.streamKeys}};

        if (req.query.genre) {
            query.genre = req.query.genre;
        }
        if (req.query.category) {
            query.category = req.query.category;
        }

        Stream.find(query).then(streams => {
            if (streams) {
                res.json(streams);
            }
        });
    }
});

router.get('/search', loginChecker.ensureLoggedIn(), (req, res) => {
    if (req.query.streamKeys) {
        const searchQuery = new RegExp(`^${req.query.query}$`, 'i');

        const query = {
            $and: [
                {streamKey: {$in: req.query.streamKeys}},
                {$or: [{title: searchQuery}, {tags: searchQuery}, {username: searchQuery}]}
            ]
        };
        if (req.query.genre) {
            query.$and.push({genre: req.query.genre});
        }
        if (req.query.category) {
            query.$and.push({category: req.query.category});
        }

        Stream.find(query).then(streams => {
            if (streams) {
                res.json(streams);
            }
        })
    }
});

router.get('/', loginChecker.ensureLoggedIn(), (req, res) => {
    Stream.findOne({username: req.query.username}).then(stream => {
        if (stream) {
            res.json({
                username: stream.username,
                streamKey: stream.streamKey,
                title: stream.title,
                genre: stream.genre,
                category: stream.category,
                tags: stream.tags
            });
        }
    });
});

module.exports = router;