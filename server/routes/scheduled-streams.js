const express = require('express');
const router = express.Router();
const {ScheduledStream, User} = require('../model/schemas');
const loginChecker = require('connect-ensure-login');
const sanitise = require('mongo-sanitize');
const {validation: {streamSettings: {titleMaxLength, tagsMaxAmount}}} = require('../../mainroom.config');
const LOGGER = require('../../logger')('./server/routes/scheduled-streams.js');

router.post('/', loginChecker.ensureLoggedIn(), async (req, res, next) => {
    const sanitisedInput = sanitise(req.body);

    if (sanitisedInput.userId !== req.user._id.toString()) {
        return res.sendStatus(401);
    }

    if (sanitisedInput.title > titleMaxLength) {
        return res.status(403).send(`Length of title was greater than the maximum allowed length of ${titleMaxLength}`);
    }
    if (sanitisedInput.tags.length > tagsMaxAmount) {
        return res.status(403).send(`Number of tags was greater than the maximum allowed amount of ${tagsMaxAmount}`);
    }

    const scheduledStream = new ScheduledStream({
        user: sanitisedInput.userId,
        startTime: sanitisedInput.startTime,
        endTime: sanitisedInput.endTime,
        title: sanitisedInput.title,
        genre: sanitisedInput.genre,
        category: sanitisedInput.category,
        tags: sanitisedInput.tags
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

router.delete('/:id', loginChecker.ensureLoggedIn(), async (req, res, next) => {
    const id = sanitise(req.params.id);
    try {
        const scheduledStream = await ScheduledStream.findById(id).select('user').exec();
        if (!scheduledStream) {
            return res.status(404).send(`Scheduled stream (_id: ${escape(id)}) not found`);
        }
        if (scheduledStream.user.toString() !== req.user._id.toString()) {
            return res.sendStatus(401);
        }
        await ScheduledStream.findByIdAndDelete(id);

        // Pull reference to ScheduledStream from nonSubscribedScheduledStreams arrays.
        // This can't be done using mongoose middleware due to the ordering of imports in ./server/model/schemas.js
        await User.updateMany({nonSubscribedScheduledStreams: id}, {$pull: {nonSubscribedScheduledStreams: id}}).exec();
        res.sendStatus(200);
    } catch (err) {
        LOGGER.error(`An error occurred when deleting scheduled stream (_id: {}) from database: {}`, id, err);
        next(err);
    }
});

module.exports = router;