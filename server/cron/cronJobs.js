const LOGGER = require('../logger')('server/cron/cronJobs.js');
const thumbnailGenerator = require('./thumbnailGeneratorCronJob');
const scheduledStreamInfoUpdater = require('./scheduledStreamInfoUpdater');

const cronJobs = [thumbnailGenerator, scheduledStreamInfoUpdater];

module.exports.startAll = () => {
    cronJobs.forEach(async cronJob => {
        await cronJob.job.start();
        if (cronJob.job.running) {
            const jobName = cronJob.jobName || Object.keys(cronJob)[0];
            LOGGER.info(`Started ${jobName} cron job with cron time: ${cronJob.job.cronTime}`);
        }
    });
}