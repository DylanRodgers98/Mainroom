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

        Stream.find(query, (err, stream) => {
            if (err) {
                return;
            }
            if (stream) {
                res.json(stream);
            }
        });
    }
});

router.get('/', loginChecker.ensureLoggedIn(), (req, res) => {
    if (req.query.username) {
        Stream.findOne({username: req.query.username}, (err, stream) => {
            if (err) {
                return;
            }
            if (stream) {
                res.json({
                    username: stream.username,
                    stream_key: stream.stream_key,
                    stream_title: stream.stream_title,
                    stream_genre: stream.stream_genre,
                    stream_tags: stream.stream_tags
                });
            }
        });
    } else {
        res.json({});
    }
});

module.exports = router;