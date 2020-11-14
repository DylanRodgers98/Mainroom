const express = require('express');
const router = express.Router();
const sanitise = require('mongo-sanitize');
const {User, RecordedStream} = require('../model/schemas');
const LOGGER = require('../../logger')('./server/routes/recorded-streams.js');

router.get('/', (req, res, next) => {
    const username = sanitise(req.query.username);
    User.findOne({username}, '_id', (err, user) => {
        if (err) {
            LOGGER.error('An error occurred when finding user {}: {}', username, err);
            next(err);
        } else if (!user) {
            res.status(404).send(`User (username: ${escape(username)}) not found`);
        } else {
            const options = {
                page: req.query.page,
                limit: req.query.limit,
                sort: '-timestamp'
            };
            RecordedStream.paginate({user: user._id, videoURL: {$ne: null}}, options, (err, result) => {
                if (err) {
                    LOGGER.error('An error occurred when finding recorded streams for user with _id {}: {}', user._id, err);
                    next(err);
                } else {
                    res.json({
                        recordedStreams: result.docs,
                        nextPage: result.nextPage
                    });
                }
            });
        }
    });
});

module.exports = router;