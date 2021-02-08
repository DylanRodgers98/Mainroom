const express = require('express');
const router = express.Router();
const {ScheduledStream, User} = require('../model/schemas');
const loginChecker = require('connect-ensure-login');
const sanitise = require('mongo-sanitize');
const LOGGER = require('../../logger')('./server/routes/scheduled-streams.js');

router.post('/', loginChecker.ensureLoggedIn(), async (req, res, next) => {
    const sanitisedQuery = sanitise(req.body);
    const scheduledStream = new ScheduledStream({
        user: sanitisedQuery.userId,
        startTime: sanitisedQuery.startTime,
        endTime: sanitisedQuery.endTime,
        title: sanitisedQuery.title,
        genre: sanitisedQuery.genre,
        category: sanitisedQuery.category,
        tags: sanitisedQuery.tags
    });
    try {
        await scheduledStream.save();
        res.sendStatus(200);
    } catch (err) {
        LOGGER.error('An error occurred when saving new ScheduledStream: {}, Error: {}', JSON.stringify(scheduledStream), err);
        next(err);
    }
});

router.get('/', async (req, res, next) => {
    const sanitisedQuery = sanitise(req.query);

    const username = sanitisedQuery.username.toLowerCase();
    let user;
    try {
        user = await User.findOne({username}).select('_id').exec();
    } catch (err) {
        LOGGER.error(`An error occurred when finding user {}: {}`, username, err);
        return next(err);
    }

    if (!user) {
        return res.status(404).send(`User (username: ${escape(username)}) not found`);
    }

    const filter = {
        user: user._id,
        startTime: {$gt: sanitisedQuery.scheduleStartTime}
    };
    try {
        const scheduledStreams = await ScheduledStream.find(filter)
            .select('title startTime endTime genre category')
            .sort('startTime')
            .exec();
        res.json({scheduledStreams});
    } catch (err) {
        LOGGER.error('An error occurred when finding scheduled streams for user {}: {}', username, err);
        next(err);
    }
});

module.exports = router;