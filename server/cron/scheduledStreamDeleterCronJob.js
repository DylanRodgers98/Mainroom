const CronJob = require('cron').CronJob;
const axios = require('axios');
const config = require('../../mainroom.config');
const moment = require('moment');
const LOGGER = require('../logger')('server/cron/scheduledStreamDeleterCronJob.js');

const jobName = 'Scheduled Stream Deleter';

const job = new CronJob(config.scheduledStreamDeleter.cron, async () => {
    const endedBefore = moment()
        .add(-config.scheduledStreamDeleter.ageToDelete.days, 'days')
        .add(-config.scheduledStreamDeleter.ageToDelete.hours, 'hours')
        .add(-config.scheduledStreamDeleter.ageToDelete.minutes, 'minutes')
        .add(-config.scheduledStreamDeleter.ageToDelete.seconds, 'seconds')
        .toDate();

    LOGGER.log(`Deleting scheduled streams that ended before ${endedBefore}`);

    await axios.post(`http://127.0.0.1:${config.server.port.http}/streams/deleteOldScheduledStreams`, {
        endedBefore: endedBefore
    });
}, null, true);

module.exports = {
    jobName: jobName,
    job: job
};