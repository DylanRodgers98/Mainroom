const express = require('express');
const router = express.Router();
const {Event, RecordedStream, ScheduledStream} = require('../model/schemas');
const sanitise = require('mongo-sanitize');
const escape = require('escape-html');
const axios = require('axios');
const LOGGER = require('../../logger')('./server/routes/events.js');

router.get('/', (req, res, next) => {
    const options = {
        page: req.query.page,
        limit: req.query.limit,
        select: '_id eventName createdBy startTime endTime thumbnail.bucket thumbnail.key',
        populate: {
            path: 'createdBy',
            select: 'displayName username'
        },
        sort: 'startTime'
    };

    const dateNow = Date.now();

    Event.paginate({endTime: {$gte: dateNow}}, options, async (err, result) => {
        if (err) {
            LOGGER.error('An error occurred when finding Events: {}', err.stack);
            return next(err);
        }
        res.json({
            events: result.docs.map(event => {
                return {
                    _id: event._id,
                    eventName: event.eventName,
                    createdBy: event.createdBy,
                    startTime: event.startTime,
                    endTime: event.endTime,
                    isHappeningNow: event.startTime >= dateNow && dateNow <= event.endTime,
                    thumbnailURL: event.getThumbnailPicURL()
                };
            }),
            nextPage: result.nextPage
        });
    });
});

router.get('/:eventId', async (req, res, next) => {
    const eventId = sanitise(req.params.eventId);

    let event;
    try {
        event = await Event.findById(eventId)
            .select('eventName createdBy startTime endTime bannerPic.bucket bannerPic.key stages')
            .populate({
                path: 'createdBy',
                select: 'username displayName'
            })
            .populate({
                path: 'stages',
                select: '_id stageName thumbnailPic.bucket thumbnailPic.key streamInfo.streamKey streamInfo.title streamInfo.genre streamInfo.category streamInfo.viewCount'
            })
            .exec();
    } catch (err) {
        LOGGER.error('An error occurred when finding Event (_id: {}): {}', eventId, err.stack);
        next(err);
    }

    if (!event) {
        return res.status(404).send(`Event (_id: ${escape(eventId)}) not found`);
    }

    const stages = [];
    for (const stage of event.stages) {
        const streamKey = stage.streamInfo.streamKey;
        const {data: {isLive}} = await axios.get(`http://localhost:${process.env.RTMP_SERVER_HTTP_PORT}/api/streams/live/${streamKey}`, {
            headers: {Authorization: config.rtmpServer.auth.header}
        });

        stages.push({
            _id: stage._id,
            isLive,
            stageName: stage.stageName,
            thumbnailURL: stage.getThumbnailPicURL(),
            streamInfo: {
                title: stage.streamInfo.title,
                genre: stage.streamInfo.genre,
                category: stage.streamInfo.category,
                viewCount: stage.streamInfo.viewCount
            }
        });
    }

    res.json({
        eventName: event.eventName,
        createdBy: event.createdBy,
        startTime: event.startTime,
        endTime: event.endTime,
        bannerPicURL: event.getBannerPicURL(),
        stages
    });
});

router.get('/:eventId/recorded-streams', async (req, res, next) => {
    const eventId = sanitise(req.params.eventId);

    let event;
    try {
        event = await Event.findById(eventId)
            .select('stages')
            .exec();
    } catch (err) {
        LOGGER.error('An error occurred when finding Event (_id: {}): {}', eventId, err.stack);
        next(err);
    }

    if (!event) {
        return res.status(404).send(`Event (_id: ${escape(eventId)}) not found`);
    }

    if (!event.stages || !event.stages.length) {
        return res.json({
            recordedStreams: [],
            nextPage: null
        });
    }

    const options = {
        page: req.query.page,
        limit: req.query.limit,
        select: '_id timestamp title genre category thumbnail.bucket thumbnail.key viewCount videoDuration',
        sort: '-timestamp'
    };

    RecordedStream.paginate({eventStage: {$in: event.stages}}, options, (err, result) => {
        if (err) {
            LOGGER.error('An error occurred when finding recorded streams for Event (_id: {}): {}', eventId, err.stack);
            next(err);
        } else {
            res.json({
                recordedStreams: result.docs.map(stream => {
                    return {
                        _id: stream._id,
                        timestamp: stream.timestamp,
                        title: stream.title,
                        genre: stream.genre,
                        category: stream.category,
                        viewCount: stream.viewCount,
                        videoDuration: stream.videoDuration,
                        thumbnailURL: stream.getThumbnailURL()
                    };
                }),
                nextPage: result.nextPage
            });
        }
    });
});

router.get('/:eventId/scheduled-streams', async (req, res, next) => {
    const eventId = sanitise(req.params.eventId);

    let event;
    try {
        event = await Event.findById(eventId)
            .select('stages')
            .populate({
                path: 'stages',
                select: '_id stageName'
            })
            .exec();
    } catch (err) {
        LOGGER.error('An error occurred when finding Event (_id: {}): {}', eventId, err.stack);
        next(err);
    }

    if (!event.stages || !event.stages.length) {
        return res.json({
            scheduleGroups: [],
            scheduleItems: []
        });
    }

    const filter = {
        eventStage: {$in: event.stages.map(stage => stage._id)},
        startTime: {$lte: req.query.scheduleEndTime},
        endTime: {$gte: req.query.scheduleStartTime}
    };

    let scheduledStreams;
    try {
        scheduledStreams = await ScheduledStream.find(filter)
            .select('eventStage title startTime endTime genre category')
            .populate({
                path: 'eventStage',
                select: '_id stageName'
            })
            .sort('startTime')
            .exec();
    } catch (err) {
        LOGGER.error('An error occurred when finding scheduled streams for Event (_id: {}): {}', eventId, err.stack);
        next(err);
    }

    res.json({
        scheduleGroups: event.stages.map(stage => {
            return {
                id: stage._id,
                title: stage.stageName
            };
        }),
        scheduleItems: !scheduledStreams ? [] : scheduledStreams.map((scheduledStream, index) => {
            return {
                _id: scheduledStream._id,
                id: index,
                group: scheduledStream.eventStage._id,
                title: scheduledStream.title || scheduledStream.eventStage.stageName,
                start_time: scheduledStream.startTime,
                end_time: scheduledStream.endTime,
                genre: scheduledStream.genre,
                category: scheduledStream.category
            };
        })
    });
});

module.exports = router;