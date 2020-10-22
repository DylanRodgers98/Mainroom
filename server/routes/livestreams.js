const express = require('express');
const router = express.Router();
const config = require('../../mainroom.config');
const axios = require('axios');
const {User} = require('../model/schemas');
const _ = require('lodash');
const sanitise = require('mongo-sanitize');
const {getThumbnail} = require('../aws/s3ThumbnailRetriever');
const LOGGER = require('../../logger')('./server/routes/livestreams.js');

router.get('/', async (req, res, next) => {
    const result = await axios.get(`http://${config.rtmpServer.host}:${config.rtmpServer.http.port}/api/streams`);
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
            select: 'username displayName streamInfo.streamKey',
            page: req.query.page,
            limit: req.query.limit
        };

        User.paginate(query, options, async (err, result) => {
            if (err) {
                LOGGER.error('An error occurred when finding livestream info: {}', err);
                next(err);
            } else if (result) {
                const streams = [];
                for (const user of result.docs) {
                    const streamKey = user.streamInfo.streamKey;
                    let thumbnailURL;
                    try {
                        thumbnailURL = await getThumbnail(streamKey);
                    } catch (err) {
                        LOGGER.info('An error occurred when getting thumbnail for stream (stream key: {}). Returning default thumbnail. Error: {}', streamKey, err);
                        thumbnailURL = config.defaultThumbnailURL;
                    }
                    streams.push({
                        username: user.username,
                        displayName: user.displayName,
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

router.get('/:streamKey/thumbnail', async (req, res, next) => {
    const streamKey = sanitise(req.params.streamKey);
    try {
        const thumbnailURL = await getThumbnail(streamKey);
        res.json({ thumbnailURL });
    } catch (err) {
        LOGGER.info('An error occurred when getting thumbnail for stream (stream key: {}). Returning default thumbnail. Error: {}', streamKey, err);
        res.json({
            thumbnailURL: config.defaultThumbnailURL
        });
    }
});

module.exports = router;