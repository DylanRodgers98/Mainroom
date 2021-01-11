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
                sort: '-timestamp',
                select: '_id timestamp title genre category thumbnailURL viewCount'
            };
            RecordedStream.paginate({user}, options, (err, result) => {
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

router.get('/:streamId', (req, res, next) => {
    const streamId = sanitise(req.params.streamId);
    RecordedStream.findById(streamId)
        .select('user timestamp title genre category videoURL viewCount')
        .populate({
            path: 'user',
            select: 'username displayName profilePicURL'
        })
        .exec((err, recordedStream) => {
            if (err) {
                LOGGER.error('An error occurred when finding recorded stream (_id: {}): {}', streamId, err);
                next(err);
            } else if (!recordedStream) {
                res.status(404).send(`Recorded stream (_id: ${escape(streamId)}) not found`);
            } else {
                recordedStream.updateOne({$inc: {viewCount: 1}}, err => {
                    if (err) {
                        LOGGER.error('An error occurred when incrementing view count for recorded stream (_id: {}): {}', streamId, err);
                        next(err);
                    } else {
                        res.json({
                            recordedStream
                        });
                    }
                });
            }
        });
});

module.exports = router;