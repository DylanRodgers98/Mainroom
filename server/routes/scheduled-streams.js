const express = require('express');
const router = express.Router();
const {ScheduledStream, User} = require('../model/schemas');
const loginChecker = require('connect-ensure-login');
const mainroomEventEmitter = require('../mainroomEventEmitter');
const sanitise = require('mongo-sanitize');
const LOGGER = require('../../logger')('./server/routes/scheduled-streams.js');

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
            LOGGER.error('An error occurred when saving new ScheduledStream: {}, Error: {}', JSON.stringify(scheduledStream), err);
            next(err);
        } else {
            User.findOne({username: req.user.username})
                .select('username displayName subscribers profilePicURL')
                .populate({
                    path: 'subscribers',
                    select: 'username displayName email emailSettings'
                })
                .exec((err, user) => {
                    if (err) {
                        LOGGER.error('An error occurred when finding User {}: {}', req.user.username, err);
                        next(err);
                    } else {
                        mainroomEventEmitter.emit('onCreateScheduledStream', user, scheduledStream)
                        res.sendStatus(200);
                    }
                });
        }
    });
});

router.get('/', (req, res, next) => {
    const username = sanitise(req.query.username.toLowerCase());
    ScheduledStream.find({
        $or: [
            {startTime: {$gte: req.query.scheduleStartTime}},
            {endTime: {$gt: req.query.scheduleStartTime}}
        ]
    })
    .populate({
        path: 'user',
        select: 'username',
        match: {
            username
        }
    })
    .select('title startTime endTime genre category')
    .exec((err, scheduledStreams) => {
        if (err) {
            LOGGER.error('An error occurred when finding scheduled streams for user {}: {}', username, err);
            next(err);
        } else {
            res.json({
                scheduledStreams
            });
        }
    });
});

module.exports = router;