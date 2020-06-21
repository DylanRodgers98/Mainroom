const express = require('express');
const router = express.Router();
const User = require('../database/schema').User;
const loginChecker = require('connect-ensure-login');

router.get('/info', loginChecker.ensureLoggedIn(), (req, res) => {
    if (req.query.stream_keys) {
        const query = {stream_key: {$in: req.query.stream_keys}};
        if (req.query.genre) {
            query.stream_genre = req.query.genre;
        }

        User.find(query, (err, users) => {
            if (err) {
                return;
            }
            if (users) {
                res.json(users);
            }
        });
    }
});

module.exports = router;