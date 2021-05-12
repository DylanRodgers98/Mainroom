const express = require('express');
const router = express.Router();
const config = require('../../mainroom.config');
const axios = require('axios');
const {User} = require('../model/schemas');
const _ = require('lodash');
const sanitise = require('mongo-sanitize');
const {getThumbnail} = require('../aws/s3ThumbnailGenerator');
const LOGGER = require('../../logger')('./server/routes/livestreams.js');

router.get('/', async (req, res, next) => {
    const result = await axios.get(`http://localhost:${process.env.RTMP_SERVER_HTTP_PORT}/api/streams`, {
        headers: { Authorization: config.rtmpServer.auth.header }
    });
    const streamKeys = result.data.live ? Object.getOwnPropertyNames(result.data.live) : [];
    if (streamKeys.length) {
        const query = {
            'streamInfo.streamKey': {$in: streamKeys}
        };
        if (req.query.searchQuery) {
            const sanitisedQuery = sanitise(req.query.searchQuery);
            const escapedQuery = _.escapeRegExp(sanitisedQuery)
            const searchQuery = new RegExp(`^${escapedQuery}$`, 'i');
            query.$or = [
                {'streamInfo.title': searchQuery},
                {'streamInfo.genre': searchQuery},
                {'streamInfo.category': searchQuery},
                {'streamInfo.tags': searchQuery},
                {username: searchQuery},
                {displayName: searchQuery}
            ];
        }
        if (req.query.genre) {
            query['streamInfo.genre'] = sanitise(req.query.genre);
        }
        if (req.query.category) {
            query['streamInfo.category'] = sanitise(req.query.category);
        }
        if (req.query.usernames) {
            query.username = {$in: req.query.usernames}
        }

        const options = {
            page: req.query.page,
            limit: req.query.limit,
            select: 'username displayName profilePic.bucket profilePic.key +streamInfo.streamKey streamInfo.title streamInfo.genre streamInfo.category streamInfo.viewCount streamInfo.startTime',
            sort: '-streamInfo.viewCount'
        };

        User.paginate(query, options, async (err, result) => {
            if (err) {
                LOGGER.error('An error occurred when finding livestream info: {}', err.stack);
                next(err);
            } else {
                const streams = [];
                for (const user of result.docs) {
                    const streamKey = user.streamInfo.streamKey;
                    let thumbnailURL;
                    try {
                        thumbnailURL = await getThumbnail(streamKey);
                    } catch (err) {
                        LOGGER.info('An error occurred when getting thumbnail for stream (stream key: {}). Returning default thumbnail. Error: {}', streamKey, err.stack);
                        thumbnailURL = config.defaultThumbnailURL;
                    }
                    streams.push({
                        username: user.username,
                        displayName: user.displayName,
                        profilePicURL: user.getProfilePicURL(),
                        title: user.streamInfo.title,
                        genre: user.streamInfo.genre,
                        category: user.streamInfo.category,
                        viewCount: user.streamInfo.viewCount,
                        startTime: user.streamInfo.startTime,
                        thumbnailURL
                    });
                }
                res.json({
                    streams,
                    nextPage: result.nextPage
                });
            }
        });
    } else {
        res.json({});
    }
});

router.get('/:streamKey/thumbnail', async (req, res) => {
    const streamKey = sanitise(req.params.streamKey);
    try {
        const thumbnailURL = await getThumbnail(streamKey);
        res.json({ thumbnailURL });
    } catch (err) {
        LOGGER.info('An error occurred when getting thumbnail for stream (stream key: {}). Returning default thumbnail. Error: {}', streamKey, err.stack);
        res.json({
            thumbnailURL: config.defaultThumbnailURL
        });
    }
});

module.exports = router;