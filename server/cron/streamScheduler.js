const {CronJob} = require('cron');
const {cronTime} = require('../../mainroom.config');
const {ScheduledStream, User, EventStage} = require('../model/schemas');
const CompositeError = require('../errors/CompositeError');
const snsErrorPublisher = require('../aws/snsErrorPublisher');
const {spawn} = require('child_process');
const LOGGER = require('../../logger')('./server/cron/streamScheduler.js');

const RTMP_SERVER_RTMP_PORT = process.env.RTMP_SERVER_RTMP_PORT !== '1935' ? `:${process.env.RTMP_SERVER_RTMP_PORT}` : '';
const RTMP_SERVER_URL = `rtmp://localhost${RTMP_SERVER_RTMP_PORT}/${process.env.RTMP_SERVER_APP_NAME}`;

const jobName = 'Stream Scheduler';

let lastTimeTriggered = Date.now();
let isFirstTimeTriggered = true;

const job = new CronJob(cronTime.scheduledStreamInfoUpdater, async () => {
    LOGGER.debug(`${jobName} triggered`);

    const thisTimeTriggered = job.lastDate().valueOf();

    let query = {
        $and: [
            {startTime: {$gt: lastTimeTriggered}},
            {startTime: {$lte: thisTimeTriggered}}
        ]
    };

    if (isFirstTimeTriggered) {
        isFirstTimeTriggered = false;
        query = {
            $or: [query, {
                // Find scheduled streams that should have started before now and are due to finish after now.
                // This is to ensure streams that are meant to be live now are actually live, e.g., in the case
                // of a server restart, scheduled streams with a prerecorded video can be started again from the
                // correct position corresponding to the current time
                $and: [
                    {startTime: {$lte: thisTimeTriggered}},
                    {endTime: {$gt: thisTimeTriggered}}
                ]
            }]
        }
    }

    let streams;
    try {
        streams = await ScheduledStream.find(query)
            .select('user eventStage startTime title genre category tags')
            .populate({
                path: 'user',
                select: '_id'
            })
            .populate({
                path: 'eventStage',
                select: '_id'
            })
            .exec();
    } catch (err) {
        LOGGER.error('An error occurred when finding scheduled streams starting between {} and {}: {}',
            lastTimeTriggered, thisTimeTriggered, err.stack);

        lastTimeTriggered = thisTimeTriggered;
        return await snsErrorPublisher.publish(err);
    }

    if (!streams.length) {
        LOGGER.info('No streams found starting between {} and {}, so nothing to update',
            lastTimeTriggered, thisTimeTriggered);
    } else {
        const possessionSuffix = streams.length === 1 ? `'s` : `s'`;
        LOGGER.info('Updating {} user{}/stage{} stream info from scheduled streams',
            streams.length, possessionSuffix, possessionSuffix);

        const promises = [];

        for (const stream of streams) {
            if (stream.eventStage) {
                const eventStage = await EventStage.findById(stream.eventStage._id)
                    .select('+streamInfo.streamKey')
                    .exec();

                const prerecordedVideoFileURL = stream.getPrerecordedVideoFileURL();
                if (prerecordedVideoFileURL) {
                    const startStreamPromise = startStreamFromPrerecordedVideo({
                        startTime: thisTimeTriggered - stream.startTime.valueOf(),
                        inputURL: prerecordedVideoFileURL,
                        streamKey: eventStage.streamInfo.streamKey
                    });
                    promises.push(startStreamPromise);
                }

                eventStage.streamInfo.title = stream.title;
                eventStage.streamInfo.genre = stream.genre;
                eventStage.streamInfo.category = stream.category;
                eventStage.streamInfo.tags = stream.tags;
                promises.push(eventStage.save());
            } else {
                const updateUserPromise = User.findByIdAndUpdate(stream.user._id, {
                    'streamInfo.title': stream.title,
                    'streamInfo.genre': stream.genre,
                    'streamInfo.category': stream.category,
                    'streamInfo.tags': stream.tags
                });
                promises.push(updateUserPromise);
            }
        }

        const promiseResults = await Promise.allSettled(promises);
        const rejectedPromises = promiseResults.filter(res => res.status === 'rejected');

        if (rejectedPromises.length) {
            const err = new CompositeError(rejectedPromises.map(promise => promise.reason));
            LOGGER.error('{} error{} occurred when updating user/stage stream info from scheduled streams. Error: {}',
                rejectedPromises.length, rejectedPromises.length === 1 ? '' : 's', err.stack);
            lastTimeTriggered = thisTimeTriggered;
            return await snsErrorPublisher.publish(err);
        }

        LOGGER.info(`Successfully updated {}/{} user{}/stage{} stream info from scheduled streams`,
            promiseResults.length, streams.length, possessionSuffix, possessionSuffix);
    }

    lastTimeTriggered = thisTimeTriggered;

    LOGGER.debug(`${jobName} finished`);
});

function startStreamFromPrerecordedVideo({startTime, inputURL, streamKey}) {
    LOGGER.debug('Starting stream from prerecorded video at {} (stream key: {})', inputURL, streamKey);

    const args = ['-re', '-y'];
    if (startTime > 0) {
        args.push('-ss', `${startTime}ms`);
    }
    args.push('-i', inputURL, '-c:v', 'copy', '-c:a', 'copy', '-f', 'tee', '-map', '0:a?', '-map', '0:v?', '-f', 'flv', `${RTMP_SERVER_URL}/${streamKey}`);

    return new Promise((resolve, reject) => {
        spawn(process.env.FFMPEG_PATH, args, {detached: true, stdio: 'ignore'})
            .on('spawn', resolve)
            .on('error', reject)
            .unref();
    });
}

module.exports = {jobName, job};