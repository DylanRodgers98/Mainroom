const express = require('express');
const router = express.Router();
const Stream = require('../database/schema').Stream;
const shortid = require('shortid');
const loginChecker = require('connect-ensure-login');

router.get('/', loginChecker.ensureLoggedIn(), (req, res) => {
    Stream.findOne({username: req.user.username}, (err, stream) => {
        if (!err) {
            res.json({
                streamKey: stream.streamKey,
                streamTitle: stream.title,
                streamGenre: stream.genre,
                streamCategory: stream.category,
                streamTags: stream.tags
            });
        }
    });
});

router.post('/', loginChecker.ensureLoggedIn(), (req, res) => {
    Stream.findOneAndUpdate({
        username: req.user.username
    }, {
        title: req.body.streamTitle,
        genre: req.body.streamGenre,
        category: req.body.streamCategory,
        tags: req.body.streamTags
    }, {
        new: true,
    }, (err, stream) => {
        if (!err) {
            res.json({
                streamTitle: stream.title,
                streamGenre: stream.genre,
                streamCategory: stream.category,
                streamTags: stream.tags
            });
        }
    });
});

router.post('/streamKey', loginChecker.ensureLoggedIn(), (req, res) => {
    Stream.findOneAndUpdate({
        username: req.user.username
    }, {
        streamKey: shortid.generate()
    }, {
        new: true,
    }, (err, stream) => {
        if (!err) {
            res.json({
                streamKey: stream.streamKey
            })
        }
    });
});

module.exports = router;

