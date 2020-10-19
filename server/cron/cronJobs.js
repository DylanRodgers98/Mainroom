const LOGGER = require('../../logger')('./server/cron/cronJobs.js');

const cronJobs = [
    require('./scheduledStreamInfoUpdater'),
    require('./upcomingScheduledStreamEmailer')
];

module.exports.startAll = () => {
    cronJobs.forEach(async cronJob => {
        await cronJob.job.start();
        if (cronJob.job.running) {
            LOGGER.info('Started {} cron job with cron time: {}', cronJob.jobName, cronJob.job.cronTime);
        }
    });
}