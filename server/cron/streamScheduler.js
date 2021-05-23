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

const job = new CronJob(cronTime.scheduledStreamInfoUpdater, () => {
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

    ScheduledStream.find(query, async (err, streams) => {
        if (err) {
            LOGGER.error('An error occurred when finding scheduled streams starting between {} and {}: {}',
                lastTimeTriggered, thisTimeTriggered, err.stack);
            return await snsErrorPublisher.publish(err);
        } else if (!streams.length) {
            LOGGER.info('No streams found starting between {} and {}, so nothing to update',
                lastTimeTriggered, thisTimeTriggered);
        } else {
            const suffix = streams.length === 1 ? `'s` : `s'`;
            LOGGER.info('Updating {} user{}/stage{} stream info from scheduled streams',
                streams.length, suffix, suffix);

            const errors = [];
            let updated = 0;

            for (const stream of streams) {
                if (stream.eventStage) {
                    try {
                        const eventStage = await EventStage.findById(stream.eventStage._id)
                            .select('+streamInfo.streamKey')
                            .exec();

                        const prerecordedVideoFileURL = stream.getPrerecordedVideoFileURL();
                        if (prerecordedVideoFileURL) {
                            const startTime = thisTimeTriggered - stream.startTime.valueOf();
                            startStreamFromPrerecordedVideo(startTime, prerecordedVideoFileURL, eventStage.streamInfo.streamKey);
                        }

                        eventStage.streamInfo.title = stream.title;
                        eventStage.streamInfo.title = stream.title;
                        eventStage.streamInfo.genre = stream.genre;
                        eventStage.streamInfo.category = stream.category;
                        eventStage.streamInfo.tags = stream.tags;
                        await eventStage.save();

                        updated++;
                    } catch (err) {
                        LOGGER.error('An error occurred when updating stream info for EventStage (_id: {}): {}',
                            stream.eventStage._id, err.stack);
                        errors.push(err);
                    }
                } else {
                    try {
                        await User.findByIdAndUpdate(stream.user._id, {
                            'streamInfo.title': stream.title,
                            'streamInfo.genre': stream.genre,
                            'streamInfo.category': stream.category,
                            'streamInfo.tags': stream.tags
                        });
                        updated++;
                    } catch (err) {
                        LOGGER.error('An error occurred when updating stream info for User (_id: {}): {}',
                            stream.user._id, err.stack);
                        errors.push(err);
                    }
                }
            }

            if (errors.length) {
                const err = new CompositeError(errors);
                LOGGER.error('{} error{} occurred when updating user stream info from scheduled streams. Error: {}',
                    errors.length, errors.length === 1 ? '' : 's', err.stack);
                return await snsErrorPublisher.publish(err);
            }

            LOGGER.info(`Successfully updated {}/{} user{}/stage{} stream info from scheduled streams`,
                updated, streams.length, suffix, suffix);
        }

        lastTimeTriggered = thisTimeTriggered;
    });

    LOGGER.debug(`${jobName} finished`);
});

function startStreamFromPrerecordedVideo(startTime, prerecordedVideoFileURL, streamKey) {
    LOGGER.debug('Starting stream from prerecorded video at {} (stream key: {})', prerecordedVideoFileURL, streamKey);

    const args = ['-re', '-y'];
    if (startTime > 0) {
        args.push('-ss', `${startTime}ms`);
    }
    args.push('-i', prerecordedVideoFileURL, '-c:v', 'copy', '-c:a', 'copy', '-f', 'tee', '-map', '0:a?', '-map', '0:v?', '-f', 'flv', `${RTMP_SERVER_URL}/${streamKey}`);

    spawn(process.env.FFMPEG_PATH, args, {detached: true, stdio: 'ignore'}).unref();
}

module.exports = {jobName, job};