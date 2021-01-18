const express = require('express');
const router = express.Router();
const sanitise = require('mongo-sanitize');
const _ = require('lodash');
const {User, RecordedStream} = require('../model/schemas');
const loginChecker = require('connect-ensure-login');
const AWS = require('aws-sdk');
const LOGGER = require('../../logger')('./server/routes/recorded-streams.js');

router.get('/', async (req, res, next) => {
    const query = {};

    const options = {
        page: req.query.page,
        limit: req.query.limit,
        select: '_id user timestamp title genre category tags thumbnailURL viewCount',
        populate: {
            path: 'user',
            select: 'username displayName profilePicURL'
        }
    };

    if (req.query.username) {
        const username = sanitise(req.query.username);
        try {
            const user = await User.findOne({username}, '_id');
            if (!user) {
                return res.status(404).send(`User (username: ${escape(username)}) not found`);
            }
            query.user = user;
        } catch (err) {
            LOGGER.error('An error occurred when finding user {}: {}', username, err);
            next(err);
        }
        options.sort = '-timestamp';
    } else {
        if (req.query.searchQuery) {
            const sanitisedQuery = sanitise(req.query.searchQuery);
            const escapedQuery = _.escapeRegExp(sanitisedQuery)
            const searchQuery = new RegExp(`^${escapedQuery}$`, 'i');
            query.$or = [
                {title: searchQuery},
                {tags: searchQuery}
            ];
            try {
                const users = await User.find({
                    $or: [
                        {username: searchQuery},
                        {displayName: searchQuery}
                    ]
                }, '_id');
                if (users.length) {
                    const userIds = users.map(user => user._id);
                    query.$or.push({user: {$in: userIds}});
                }
            } catch (err) {
                LOGGER.error(`An error occurred when finding users using search query '{}': {}`, searchQuery, err);
                next(err);
            }
        }
        if (req.query.genre) {
            query.genre = sanitise(req.query.genre);
        }
        if (req.query.category) {
            query.category = sanitise(req.query.category);
        }
        options.sort = '-viewCount';
    }

    RecordedStream.paginate(query, options, (err, result) => {
        if (err) {
            LOGGER.error('An error occurred when finding recorded streams: {}', err);
            next(err);
        } else {
            res.json({
                recordedStreams: result.docs,
                nextPage: result.nextPage
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

const S3 = new AWS.S3();

router.delete('/:id', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const id = sanitise(req.params.id);
    RecordedStream.findById(id, 'videoURL thumbnailURL', async (err, stream) => {
        if (err) {
            LOGGER.error(`An error occurred when finding recorded stream (_id: {}) in database: {}`, id, err);
            next(err);
        } else if (!stream) {
            res.status(404).send(`Stream (_id: ${escape(id)}) not found`);
        } else {
            const video = extractBucketAndKey(stream.videoURL);
            const thumbnail = extractBucketAndKey(stream.thumbnailURL);

            const deleteVideoPromise = S3.deleteObject({
                Bucket: video.bucket,
                Key: video.key
            }).promise();

            const deleteThumbnailPromise = S3.deleteObject({
                Bucket: thumbnail.bucket,
                Key: thumbnail.key
            }).promise()

            try {
                await Promise.all([deleteVideoPromise, deleteThumbnailPromise]);
            } catch (err) {
                LOGGER.error(`An error occurred when deleting recorded stream in S3 (video: [bucket: {}, key: {}], thumbnail: [bucket: {}, key: {}]): {}`,
                    video.bucket, video.key, thumbnail.bucket, thumbnail.key, err);
                next(err);
            }

            stream.deleteOne(err => {
                if (err) {
                    LOGGER.error(`An error occurred when deleting recorded stream (_id: {}) from database: {}`, id, err);
                    next(err);
                } else {
                    res.sendStatus(200);
                }
            });
        }
    });
});

function extractBucketAndKey(urlString) {
    const url = new URL(urlString);
    const bucket = url.hostname.replace('.s3.amazonaws.com', '');
    const key = url.pathname.substring(1); // remove leading slash
    return {bucket, key};
}

module.exports = router;