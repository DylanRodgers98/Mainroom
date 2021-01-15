const express = require('express');
const router = express.Router();
const sanitise = require('mongo-sanitize');
const {User, RecordedStream} = require('../model/schemas');
const loginChecker = require('connect-ensure-login');
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

router.get('/:id', (req, res, next) => {
    const id = sanitise(req.params.id);
    RecordedStream.findById(id)
        .select('user timestamp title genre category videoURL viewCount')
        .populate({
            path: 'user',
            select: 'username displayName profilePicURL'
        })
        .exec((err, recordedStream) => {
            if (err) {
                LOGGER.error('An error occurred when finding recorded stream (_id: {}): {}', id, err);
                next(err);
            } else if (!recordedStream) {
                res.status(404).send(`Recorded stream (_id: ${escape(id)}) not found`);
            } else {
                recordedStream.updateOne({$inc: {viewCount: 1}}, err => {
                    if (err) {
                        LOGGER.error('An error occurred when incrementing view count for recorded stream (_id: {}): {}', id, err);
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

router.patch('/:id', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const id = sanitise(req.params.id);
    RecordedStream.findByIdAndUpdate(id, {
        title: sanitise(req.body.title),
        genre: sanitise(req.body.genre),
        category: sanitise(req.body.category),
        tags: sanitise(req.body.tags)
    }, {
        new: true,
    }, (err, stream) => {
        if (err) {
            LOGGER.error(`An error occurred when updating info for recorded stream (_id: {}): {}`, id, err);
            next(err);
        } else if (!stream) {
            res.status(404).send(`Stream (_id: ${escape(id)}) not found`);
        } else {
            res.json({
                title: stream.title,
                genre: stream.genre,
                category: stream.category,
                tags: stream.tags
            });
        }
    });
});

router.delete('/:id', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const id = sanitise(req.params.id);
    RecordedStream.findByIdAndDelete(id, err => {
        if (err) {
            LOGGER.error(`An error occurred when deleting recorded stream (_id: {}): {}`, id, err);
            next(err);
        } else {
            res.sendStatus(200);
        }
    });
});

module.exports = router;