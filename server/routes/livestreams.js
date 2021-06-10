const express = require('express');
const router = express.Router();
const config = require('../../mainroom.config');
const axios = require('axios');
const {User, EventStage, Event} = require('../model/schemas');
const _ = require('lodash');
const sanitise = require('mongo-sanitize');
const {getThumbnail} = require('../aws/s3ThumbnailGenerator');
const LOGGER = require('../../logger')('./server/routes/livestreams.js');

router.get('/', async (req, res, next) => {
    const streamKeys = await getLiveStreamKeys();
    if (!streamKeys.length) {
        return res.json({});
    }

    const query = {
        'streamInfo.streamKey': {$in: streamKeys}
    };
    if (req.query.searchQuery) {
        const sanitisedQuery = sanitise(req.query.searchQuery);
        const escapedQuery = _.escapeRegExp(sanitisedQuery)
        const searchQuery = new RegExp(escapedQuery, 'i');
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
            LOGGER.error('An error occurred when finding User livestream info: {}', err.stack);
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
});


router.get('/event-stages', async (req, res, next) => {
    const streamKeys = await getLiveStreamKeys();
    if (!streamKeys.length) {
        return res.json({});
    }

    const query = {
        'streamInfo.streamKey': {$in: streamKeys}
    };
    if (req.query.searchQuery) {
        const sanitisedQuery = sanitise(req.query.searchQuery);
        const escapedQuery = _.escapeRegExp(sanitisedQuery)
        const searchQuery = new RegExp(escapedQuery, 'i');
        query.$or = [
            {'streamInfo.title': searchQuery},
            {'streamInfo.genre': searchQuery},
            {'streamInfo.category': searchQuery},
            {'streamInfo.tags': searchQuery}
        ];

        try {
            const users = await User.find({
                $or: [
                    {username: searchQuery},
                    {displayName: searchQuery}
                ]
            }).select('_id').exec();
            if (users.length) {
                const userIds = users.map(user => user._id);
                const events = await Event.find({createdBy: {$in: userIds}}).select('_id').exec();
                if (events.length) {
                    const eventIds = events.map(event => event._id);
                    query.$or.push({event: {$in: eventIds}});
                }
            }
        } catch (err) {
            LOGGER.error(`An error occurred when finding events querying createdBy.username and createdBy.displayName with '{}': {}`,
                searchQuery, err.stack);
            next(err);
        }
    }
    if (req.query.genre) {
        query['streamInfo.genre'] = sanitise(req.query.genre);
    }
    if (req.query.category) {
        query['streamInfo.category'] = sanitise(req.query.category);
    }
    if (req.query.eventIds) {
        query['event._id'] = {$in: req.query.eventIds}
    }

    const options = {
        page: req.query.page,
        limit: req.query.limit,
        select: '_id event stageName +streamInfo.streamKey streamInfo.title streamInfo.genre streamInfo.category streamInfo.viewCount streamInfo.startTime',
        populate: {
            path: 'event',
            select: '_id eventName'
        },
        sort: '-streamInfo.viewCount'
    };

    EventStage.paginate(query, options, async (err, result) => {
        if (err) {
            LOGGER.error('An error occurred when finding EventStage livestream info: {}', err.stack);
            return next(err);
        }

        const streams = [];
        for (const eventStage of result.docs) {
            const streamKey = eventStage.streamInfo.streamKey;
            let thumbnailURL;
            try {
                thumbnailURL = await getThumbnail(streamKey);
            } catch (err) {
                LOGGER.info('An error occurred when getting thumbnail for stream (stream key: {}). Returning default thumbnail. Error: {}', streamKey, err.stack);
                thumbnailURL = config.defaultThumbnailURL;
            }
            streams.push({
                eventStageId: eventStage._id,
                stageName: eventStage.stageName,
                event: eventStage.event,
                title: eventStage.streamInfo.title,
                genre: eventStage.streamInfo.genre,
                category: eventStage.streamInfo.category,
                viewCount: eventStage.streamInfo.viewCount,
                startTime: eventStage.streamInfo.startTime,
                thumbnailURL
            });
        }
        res.json({
            streams,
            nextPage: result.nextPage
        });
    });
});

async function getLiveStreamKeys() {
    const {data} = await axios.get(`http://localhost:${process.env.RTMP_SERVER_HTTP_PORT}/api/streams`, {
        headers: { Authorization: config.rtmpServer.auth.header }
    });
    return data.live ? Object.getOwnPropertyNames(data.live) : [];
}

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