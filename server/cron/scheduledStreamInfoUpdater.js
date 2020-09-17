const CronJob = require('cron').CronJob;
const config = require('../../mainroom.config');
const {ScheduledStream, User} = require('../database/schemas');
const LOGGER = require('../logger')('server/cron/scheduledStreamInfoUpdater.js');

let lastTimeTriggered = Date.now();

const job = new CronJob(config.cron.scheduledStreamInfoUpdater, async () => {
    const thisTimeTriggered = job.lastDate().valueOf();

    const streams = await ScheduledStream.find({
        $and: [
            {startTime: {$gte: lastTimeTriggered}},
            {startTime: {$lte: thisTimeTriggered}}
        ]
    });

    if (streams.data && streams.data.length) {
        LOGGER.info(`Updating ${streams.data.length} users' stream info from scheduled streams`);
        let updated = 0;
        streams.data.forEach(stream => {
            User.findByIdAndUpdate({
                username: stream.user._id
            }, {
                'streamInfo.title': stream.title,
                'streamInfo.genre': stream.genre,
                'streamInfo.category': stream.category,
                'streamInfo.tags': stream.tags
            }, err => {
                if (!err) {
                    updated++;
                }
            });
        });
        LOGGER.info(`Successfully updated ${updated}/${streams.data.length} users' stream info from scheduled streams`);
    }
    lastTimeTriggered = thisTimeTriggered;
});

module.exports = {
    jobName: 'Scheduled Stream Info Updater',
    job: job
};