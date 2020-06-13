const express = require('express');
const router = express.Router();
const User = require('../database/Schema').User;
const shortid = require('shortid');
const loginChecker = require('connect-ensure-login');

router.get('/stream_key', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOne({email: req.user.email}, (err, user) => {
        if (!err) {
            res.json({
                stream_key: user.stream_key
            })
        }
    });
});

router.post('/stream_key', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOneAndUpdate({
        email: req.user.email
    }, {
        stream_key: shortid.generate()
    }, {
        upsert: true,
        new: true,
    }, (err, user) => {
        if (!err) {
            res.json({
                stream_key: user.stream_key
            })
        }
    });
});


module.exports = router;

