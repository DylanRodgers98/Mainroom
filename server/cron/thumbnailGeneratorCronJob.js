const CronJob = require('cron').CronJob;
const axios = require('axios');
const helpers = require('../helpers/thumbnailGenerator');
const config = require('../../mainroom.config');

const job = new CronJob(config.cron.thumbnailGenerator, async () => {
    const res = await axios.get(`http://127.0.0.1:${config.rtmpServer.http.port}/api/streams`);
    const streams = res.data['live'];
    if (typeof streams !== undefined) {
        for (const streamKey in streams) {
            if (streams.hasOwnProperty(streamKey)) {
                helpers.generateStreamThumbnail(streamKey);
            }
        }
    }
});

module.exports = {
    jobName: 'Thumbnail Generator',
    job: job
};