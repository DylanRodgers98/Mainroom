const express = require('express');
const router = express.Router();
const User = require('../database/Schema').User;
const loginChecker = require('connect-ensure-login');

router.get('/info', loginChecker.ensureLoggedIn(), (req, res) => {
    if (req.query.streams) {
        const streams = JSON.parse(req.query.streams);
        const query = {$or: []};
        for (const stream in streams) {
            if (!streams.hasOwnProperty(stream)) {
                continue;
            }
            query.$or.push({stream_key: stream});
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