const CronJob = require('cron').CronJob;
const axios = require('axios');
const helpers = require('../helpers/thumbnailGenerator');
const config = require('../../mainroom.config');

const jobName = 'Thumbnail Generator';

const job = new CronJob(config.cron.thumbnailGenerator, () => {
    axios.get(`http://127.0.0.1:${config.rtmpServer.http.port}/api/streams`).then(res => {
        const streams = res.data['live'];
        if (typeof streams !== undefined) {
            for (const streamKey in streams) {
                if (streams.hasOwnProperty(streamKey)) {
                    helpers.generateStreamThumbnail(streamKey);
                }
            }
        }
    });
}, null, true);

module.exports = {
    jobName: jobName,
    job: job
};