const express = require('express');
const router = express.Router();
const User = require('../database/schema').User;
const loginChecker = require('connect-ensure-login');

router.get('/info', loginChecker.ensureLoggedIn(), (req, res) => {
    if (req.query.streams) {
        const streams = JSON.parse(req.query.streams);
        const query = {stream_key: {$in: []}};
        for (const stream in streams) {
            if (!streams.hasOwnProperty(stream)) {
                continue;
            }
            query.stream_key.$in.push(stream);
        }

        if (req.query.genre) {
            query.genre = req.query.genre;
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