const CronJob = require('cron').CronJob;
const request = require('request');
const helpers = require('../helpers/helpers');
const config = require('../../mainroom.config');

const jobName = 'Thumbnail Generator';

const job = new CronJob(config.cron.thumbnailGenerator, () => {
    request.get(`http://127.0.0.1:${config.rtmpServer.http.port}/api/streams`, (error, response, body) => {
        const streams = JSON.parse(body)['live'];
        if (typeof streams !== undefined) {
            for (const stream in streams) {
                if (streams.hasOwnProperty(stream)) {
                    helpers.generateStreamThumbnail(stream);
                }
            }
        }
    });
}, null, true);

module.exports = {
    jobName: jobName,
    job: job
};