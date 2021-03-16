const {CronJob} = require('cron');
const {cronTime} = require('../../mainroom.config');
const {ScheduledStream, User} = require('../model/schemas');
const CompositeError = require('../errors/CompositeError');
const snsErrorPublisher = require('../aws/snsErrorPublisher');
const LOGGER = require('../../logger')('./server/cron/scheduledStreamInfoUpdater.js');

const jobName = 'Scheduled Stream Info Updater';

let lastTimeTriggered = Date.now();

const job = new CronJob(cronTime.scheduledStreamInfoUpdater, () => {
    LOGGER.debug(`${jobName} triggered`);

    const thisTimeTriggered = job.lastDate().valueOf();

    ScheduledStream.find({
        $and: [
            {startTime: {$gt: lastTimeTriggered}},
            {startTime: {$lte: thisTimeTriggered}}
        ]
    }, async (err, streams) => {
        if (err) {
            LOGGER.error('An error occurred when finding scheduled streams starting between {} and {}: {}',
                lastTimeTriggered, thisTimeTriggered, err);
            return await snsErrorPublisher.publish(err);
        } else if (!streams.length) {
            LOGGER.info('No streams found starting between {} and {}, so nothing to update',
                lastTimeTriggered, thisTimeTriggered);
        } else {
            LOGGER.info('Updating {} user{} stream info from scheduled streams',
                streams.length, streams.length === 1 ? `'s` : `s'`);

            const errors = [];
            let updated = 0;

            for (const stream of streams) {
                try {
                    await User.findByIdAndUpdate(stream.user._id, {
                        'streamInfo.title': stream.title,
                        'streamInfo.genre': stream.genre,
                        'streamInfo.category': stream.category,
                        'streamInfo.tags': stream.tags
                    });
                    updated++;
                } catch (err) {
                    LOGGER.error('An error occurred when updating stream info for user with _id {}: {}',
                        stream.user._id, err);
                    errors.push(err);
                }
            }

            if (errors.length) {
                const err = new CompositeError(errors);
                LOGGER.error('{} error{} occurred when updating user stream info from scheduled streams. Error: {}',
                    errors.length, errors.length === 1 ? '' : 's', err.toString());
                return await snsErrorPublisher.publish(err);
            }

            LOGGER.info(`Successfully updated {}/{} user{} stream info from scheduled streams`,
                updated, streams.length, streams.length === 1 ? `'s` : `s'`);
        }

        lastTimeTriggered = thisTimeTriggered;
    });

    LOGGER.debug(`${jobName} finished`);
});

module.exports = {jobName, job};