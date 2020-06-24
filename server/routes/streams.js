const express = require('express');
const router = express.Router();
const Stream = require('../database/schema').Stream;
const loginChecker = require('connect-ensure-login');

router.get('/all', loginChecker.ensureLoggedIn(), (req, res) => {
    if (req.query.stream_keys) {
        const query = {stream_key: {$in: req.query.stream_keys}};
        if (req.query.genre) {
            query.stream_genre = req.query.genre;
        }

        Stream.find(query).then(streams => {
            if (streams) {
                res.json(streams);
            }
        });
    }
});

router.get('/search', loginChecker.ensureLoggedIn(), (req, res) => {
    if (req.query.stream_keys) {
        const searchQuery = req.query.query;

        Stream.find({
            $and: [{
                stream_key: {$in: req.query.stream_keys},
                $or: [{stream_title: searchQuery}, {stream_tags: searchQuery}, {username: searchQuery}]
            }]
        }).then(streams => {
            if (streams) {
                res.json(streams);
            }
        })
    }
});

router.get('/', loginChecker.ensureLoggedIn(), (req, res) => {
    Stream.findOne({username: req.query.username}).then(stream => {
        res.json({
            username: stream.username,
            stream_key: stream.stream_key,
            stream_title: stream.stream_title,
            stream_genre: stream.stream_genre,
            stream_tags: stream.stream_tags
        });
    });
});

module.exports = router;