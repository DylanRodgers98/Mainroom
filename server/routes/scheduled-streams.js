const express = require('express');
const router = express.Router();
const {ScheduledStream, User} = require('../database/schemas');
const loginChecker = require('connect-ensure-login');

router.post('/', loginChecker.ensureLoggedIn(), (req, res) => {
    const scheduledStream = new ScheduledStream({
        user: req.user._id,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        title: req.body.title,
        genre: req.body.genre,
        category: req.body.category,
        tags: req.body.tags
    });

    scheduledStream.save(err => {
        if (!err) {
            User.findOneAndUpdate({
                username: req.user.username
            }, {
                $push: {scheduledStreams: scheduledStream._id}
            },  (err, user) => {
                if (!err && user.scheduledStreams) {
                    res.json({
                        username: user.username,
                        scheduledStream: scheduledStream
                    })
                }
            });
        }
    });
});

module.exports = router;