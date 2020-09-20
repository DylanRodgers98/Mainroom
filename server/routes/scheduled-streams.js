const express = require('express');
const router = express.Router();
const {ScheduledStream, User} = require('../database/schemas');
const loginChecker = require('connect-ensure-login');

router.post('/', loginChecker.ensureLoggedIn(), (req, res, next) => {
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
        if (err) {
            return next(err);
        } else {
            User.findOneAndUpdate({
                username: req.user.username
            }, {
                $push: {scheduledStreams: scheduledStream._id}
            }, err => {
                if (err) {
                    return next(err);
                } else {
                    res.sendStatus(200);
                }
            });
        }
    });
});

module.exports = router;