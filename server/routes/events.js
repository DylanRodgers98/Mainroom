const express = require('express');
const router = express.Router();
const {Event, EventStage, RecordedStream, ScheduledStream} = require('../model/schemas');
const sanitise = require('mongo-sanitize');
const escape = require('escape-html');
const axios = require('axios');
const loginChecker = require('connect-ensure-login');
const {
    storage: {s3, formDataKeys},
    validation: {
        event: {eventNameMaxLength, tagsMaxAmount},
        eventStage: {stageNameMaxLength}
    }
} = require('../../mainroom.config');
const multer = require('multer');
const multerS3 = require('multer-s3');
const S3V2ToV3Bridge = require('../aws/s3-v2-to-v3-bridge');
const mime = require('mime-types');
const LOGGER = require('../../logger')('./server/routes/events.js');

const S3_V2_TO_V3_BRIDGE = new S3V2ToV3Bridge();

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

    Event.paginate({endTime: {$gte: Date.now()}}, options, async (err, result) => {
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
                    thumbnailURL: event.getThumbnailPicURL()
                };
            }),
            nextPage: result.nextPage
        });
    });
});

router.post('/', loginChecker.ensureLoggedIn(), async (req, res, next) => {
    const sanitisedInput = sanitise(req.body);

    if (sanitisedInput.userId !== req.user._id.toString()) {
        return res.sendStatus(401);
    }

    if (sanitisedInput.eventName > eventNameMaxLength) {
        return res.status(403).send(`Length of event name '${escape(sanitisedInput.eventName)}' is greater than the maximum allowed length of ${eventNameMaxLength}`);
    }
    if (sanitisedInput.tags.length > tagsMaxAmount) {
        return res.status(403).send(`Number of tags was greater than the maximum allowed amount of ${tagsMaxAmount}`);
    }
    if (sanitisedInput.stages && sanitisedInput.stages.length) {
        const stageNameEncountered = [];
        sanitisedInput.stages.forEach(stage => {
            if (stage.stageName > stageNameMaxLength) {
                return res.status(403).send(`Length of stage name '${escape(stage.stageName)}' is greater than the maximum allowed length of ${stageNameMaxLength}`);
            }
            if (stageNameEncountered[stage.stageName]) {
                return res.status(403).send(`Duplicate stage names found. Names of stages must be unique.`);
            }
            stageNameEncountered[stage.stageName] = true;
        });
    }

    const event = new Event({
        eventName: sanitisedInput.eventName,
        createdBy: sanitisedInput.userId,
        startTime: sanitisedInput.startTime,
        endTime: sanitisedInput.endTime,
        tags: sanitisedInput.tags
    });
    try {
        await event.save();
    } catch (err) {
        LOGGER.error('An error occurred when saving new Event: {}, Error: {}', JSON.stringify(event), err.stack);
        next(err);
    }

    const stageIds = [];
    if (sanitisedInput.stages && sanitisedInput.stages.length) {
        for (const stage of sanitisedInput.stages) {
            const eventStage = new EventStage({
                event: event._id,
                stageName: stage.stageName,
                streamInfo: {
                    streamKey: EventStage.generateStreamKey()
                }
            });
            try {
                await eventStage.save();
            } catch (err) {
                LOGGER.error('An error occurred when saving new EventStage: {}, Error: {}',
                    JSON.stringify(eventStage), err.stack);
                next(err);
            }

            stageIds.push(eventStage._id);
        }
    }

    try {
        event.stages = stageIds;
        await event.save();
        res.json({
            eventId: event._id
        });
    } catch (err) {
        LOGGER.error('An error occurred when saving new Event: {}, Error: {}', JSON.stringify(event), err.stack);
        next(err);
    }
});

const s3UploadBannerPic = multer({
    storage: multerS3({
        s3: S3_V2_TO_V3_BRIDGE,
        bucket: s3.staticContent.bucketName,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: (req, file, cb) => {
            cb(null, undefined); // set metadata explicitly to undefined
        },
        key: (req, file, cb) => {
            const path = s3.staticContent.keyPrefixes.eventImages;
            const eventId = sanitise(req.params.eventId);
            const extension = mime.extension(file.mimetype);
            cb(null, `${path}/${eventId}/banner-${Date.now()}.${extension}`);
        }
    })
}).single(formDataKeys.event.bannerPic);

router.patch('/:eventId/bannerPic', loginChecker.ensureLoggedIn(), async (req, res, next) => {
    const eventId = sanitise(req.params.eventId);

    let event;
    try {
        event = await Event.findById(eventId)
            .select('_id createdBy')
            .populate({
                path: 'createdBy',
                select: '_id'
            })
            .exec();
        if (!event) {
            return res.status(404).send(`Event (_id: ${escape(eventId)}) not found`);
        }
    } catch (err) {
        LOGGER.error(`An error occurred when finding Event with id '{}': {}`, eventId, err.stack);
        return next(err);
    }

    if (event.createdBy._id !== req.user._id) {
        return res.sendStatus(401);
    }

    s3UploadBannerPic(req, res, async err => {
        if (err) {
            LOGGER.error('An error occurred when uploading banner pic to S3 for Event (_id: {}): {}, Error: {}',
                eventId, err.stack);
            return next(err);
        }

        event.bannerPic = {
            bucket: req.file.bucket,
            key: req.file.key
        };
        try {
            await event.save();
            res.sendStatus(200);
        } catch (err) {
            LOGGER.error('An error occurred when saving Event (_id: {}): {}, Error: {}',
                event._id, err.stack);
            next(err);
        }
    });
});

const s3UploadEventThumbnail = multer({
    storage: multerS3({
        s3: S3_V2_TO_V3_BRIDGE,
        bucket: s3.staticContent.bucketName,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: (req, file, cb) => {
            cb(null, undefined); // set metadata explicitly to undefined
        },
        key: (req, file, cb) => {
            const path = s3.staticContent.keyPrefixes.eventImages;
            const eventId = sanitise(req.params.eventId);
            const extension = mime.extension(file.mimetype);
            cb(null, `${path}/${eventId}/thumbnail-${Date.now()}.${extension}`);
        }
    })
}).single(formDataKeys.event.thumbnail);

router.patch('/:eventId/thumbnailPic', loginChecker.ensureLoggedIn(), async (req, res, next) => {
    const eventId = sanitise(req.params.eventId);

    let event;
    try {
        event = await Event.findById(eventId)
            .select('_id createdBy')
            .populate({
                path: 'createdBy',
                select: '_id'
            }).exec();
        if (!event) {
            return res.status(404).send(`Event (_id: ${escape(eventId)}) not found`);
        }
    } catch (err) {
        LOGGER.error(`An error occurred when finding Event with id '{}': {}`, eventId, err.stack);
        return next(err);
    }

    if (event.createdBy._id !== req.user._id) {
        return res.sendStatus(401);
    }

    s3UploadEventThumbnail(req, res, async err => {
        if (err) {
            LOGGER.error('An error occurred when uploading thumbnail to S3 for Event (_id: {}): {}, Error: {}',
                eventId, err.stack);
            return next(err);
        }

        event.thumbnail = {
            bucket: req.file.bucket,
            key: req.file.key
        };
        try {
            await event.save();
            res.sendStatus(200);
        } catch (err) {
            LOGGER.error('An error occurred when saving Event (_id: {}): {}, Error: {}',
                event._id, err.stack);
            next(err);
        }
    });
});

const s3UploadEventStageThumbnail = multer({
    storage: multerS3({
        s3: S3_V2_TO_V3_BRIDGE,
        bucket: s3.staticContent.bucketName,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: (req, file, cb) => {
            cb(null, undefined); // set metadata explicitly to undefined
        },
        key: (req, file, cb) => {
            const path = s3.staticContent.keyPrefixes.eventImages;
            const eventId = sanitise(req.params.eventId);
            const eventStageId = sanitise(req.params.eventStageId);
            const extension = mime.extension(file.mimetype);
            cb(null, `${path}/${eventId}/${eventStageId}-${Date.now()}.${extension}`);
        }
    })
}).single(formDataKeys.eventStage.thumbnail);

router.patch('/:eventId/stage/:eventStageId/thumbnail', loginChecker.ensureLoggedIn(), async (req, res, next) => {
    const eventStageId = sanitise(req.params.eventStageId);

    let eventStage;
    try {
        eventStage = await EventStage.findById(eventStageId)
            .select('_id event')
            .populate({
                path: 'event',
                populate: {
                    path: 'createdBy',
                    select: '_id'
                }
            })
            .exec();
        if (!eventStage) {
            return res.status(404).send(`EventStage (_id: ${escape(eventStageId)}) not found`);
        }
    } catch (err) {
        LOGGER.error(`An error occurred when finding EventStage with id '{}': {}`, eventStageId, err.stack);
        return next(err);
    }

    if (eventStage.event.createdBy._id !== req.user._id) {
        return res.sendStatus(401);
    }

    s3UploadEventStageThumbnail(req, res, async err => {
        if (err) {
            LOGGER.error('An error occurred when uploading thumbnail to S3 for EventStage (_id: {}): {}, Error: {}',
                eventStageId, err.stack);
            return next(err);
        }

        eventStage.thumbnail = {
            bucket: req.file.bucket,
            key: req.file.key
        };
        try {
            await eventStage.save();
            res.sendStatus(200);
        } catch (err) {
            LOGGER.error('An error occurred when saving EventStage (_id: {}): {}, Error: {}',
                eventStageId._id, err.stack);
            next(err);
        }
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
        LOGGER.error(`An error occurred when finding Event with id '{}': {}`, eventId, err.stack);
        return next(err);
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
        LOGGER.error(`An error occurred when finding Event with id '{}': {}`, eventId, err.stack);
        return next(err);
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
        LOGGER.error(`An error occurred when finding Event with id '{}': {}`, eventId, err.stack);
        return next(err);
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