const {CronJob} = require('cron');
const config = require('../../mainroom.config');
const {ScheduledStream, User} = require('../model/schemas');
const LOGGER = require('../../logger')('./server/cron/scheduledStreamInfoUpdater.js');

const jobName = 'Scheduled Stream Info Updater';

let lastTimeTriggered = Date.now();

const job = new CronJob(config.cron.scheduledStreamInfoUpdater, async () => {
    LOGGER.debug(`${jobName} triggered`);

    const thisTimeTriggered = job.lastDate().valueOf();

    const streams = await ScheduledStream.find({
        $and: [
            {startTime: {$gt: lastTimeTriggered}},
            {startTime: {$lte: thisTimeTriggered}}
        ]
    });

    if (streams.length) {
        LOGGER.info('Updating {} user{} stream info from scheduled streams', streams.length, streams.length === 1 ? `'s` : `s'`);
        let updated = 0;
        streams.forEach(stream => {
            User.findByIdAndUpdate(stream.user._id, {
                'streamInfo.title': stream.title,
                'streamInfo.genre': stream.genre,
                'streamInfo.category': stream.category,
                'streamInfo.tags': stream.tags
            }, err => {
                if (err) {
                    LOGGER.error('An error occurred when updating stream info for user with _id {}: {}', stream.user._id, err);
                } else {
                    updated++;
                }
            });
        });
        LOGGER.info(`Successfully updated {}/{} user{} stream info from scheduled streams`, updated, streams.length, streams.length === 1 ? `'s` : `s'`);
    }
    lastTimeTriggered = thisTimeTriggered;
});

module.exports = {jobName, job};