const CronJob = require('cron').CronJob;
const axios = require('axios');
const config = require('../../mainroom.config');
const LOGGER = require('../logger')('server/cron/scheduledStreamInfoUpdater.js');

const jobName = 'Scheduled Stream Info Updater';

let lastTimeTriggered = Date.now();

const job = new CronJob(config.cron.scheduledStreamInfoUpdater, async () => {
    const thisTimeTriggered = job.lastDate().valueOf();
    const streams = await axios.get(`http://127.0.0.1:${config.server.port.http}/streams/scheduled`, {
        params: {
            scheduledStartTime: {
                between: {
                    start: lastTimeTriggered,
                    end: thisTimeTriggered
                }
            }
        }
    });
    if (streams.data.length) {
        LOGGER.info(`Updating ${streams.data.length} users' stream info from scheduled streams`);
        let updated = 0;
        for (const stream of streams.data) {
            const res = await axios.post(`http://127.0.0.1:${config.server.port.http}/streams/user`, {
                userId: stream.user,
                title: stream.title,
                genre: stream.genre,
                category: stream.category,
                tags: stream.tags
            })
            if (res !== undefined) {
                updated++;
            }
        }
        LOGGER.info(`Successfully updated ${updated}/${streams.data.length} users' stream info from scheduled streams`);
    }
    lastTimeTriggered = thisTimeTriggered;
});

module.exports = {
    jobName: jobName,
    job: job
};