const express = require('express');
const router = express.Router();
const User = require('../database/schema').User;
const loginChecker = require('connect-ensure-login');

router.get('/', loginChecker.ensureLoggedIn(), (req, res) => {
    if (req.query.username) {
        User.findOne({
            username: req.query.username
        }, (err, user) => {
            if (err) {
                return;
            }
            if (user) {
                res.json({
                    username: user.username,
                    stream_key: user.stream_key,
                    stream_title: user.stream_title,
                    stream_genre: user.stream_genre,
                    stream_tags: user.stream_tags
                });
            }
        });
    } else {
        res.json({});
    }
});

router.get('/loggedin', loginChecker.ensureLoggedIn(), (req, res) => {
    res.json({username: req.user.username});
});

module.exports = router;