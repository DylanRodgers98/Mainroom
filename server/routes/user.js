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
                    stream_key: user.stream_key
                });
            }
        });
    } else {
        res.json({});
    }
});

module.exports = router;