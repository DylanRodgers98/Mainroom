const express = require('express');
const router = express.Router();
const Stream = require('../database/schema').Stream;
const shortid = require('shortid');
const loginChecker = require('connect-ensure-login');

router.get('/', loginChecker.ensureLoggedIn(), (req, res) => {
    Stream.findOne({username: req.user.username}, (err, stream) => {
        if (!err) {
            res.json({
                stream_key: stream.stream_key,
                stream_title: stream.stream_title,
                stream_genre: stream.stream_genre,
                stream_tags: stream.stream_tags
            });
        }
    });
});

router.post('/', loginChecker.ensureLoggedIn(), (req, res) => {
    Stream.findOneAndUpdate({
        username: req.user.username
    }, {
        stream_title: req.body.stream_title,
        stream_genre: req.body.stream_genre,
        stream_tags: req.body.stream_tags
    }, {
        new: true,
    }, (err, stream) => {
        if (!err) {
            res.json({
                stream_title: stream.stream_title,
                stream_genre: stream.stream_genre,
                stream_tags: stream.stream_tags
            });
        }
    });
});

router.post('/stream_key', loginChecker.ensureLoggedIn(), (req, res) => {
    Stream.findOneAndUpdate({
        username: req.user.username
    }, {
        stream_key: shortid.generate()
    }, {
        new: true,
    }, (err, stream) => {
        if (!err) {
            res.json({
                stream_key: stream.stream_key
            })
        }
    });
});

module.exports = router;

