const LOGGER = require('node-media-server/node_core_logger');
const thumbnailGenerator = require('./thumbnailGeneratorCronJob');

const cronJobs = [thumbnailGenerator];

function startAll() {
    cronJobs.forEach(async cronJob => {
        await cronJob.job.start();
        if (cronJob.job.running) {
            const jobName = cronJob.jobName || Object.keys(cronJob)[0];
            LOGGER.log(`Started ${jobName} cron job with cron time: ${cronJob.job.cronTime}`);
        }
    });
}

module.exports = {
    startAll: startAll
}