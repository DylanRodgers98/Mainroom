const CronJob = require('cron').CronJob;
const request = require('request');
const helpers = require('../helpers/helpers');
const config = require('../../mainroom.config');

const job = new CronJob('*/5 * * * * *', () => {
    request.get(`http://127.0.0.1:${config.rtmpServer.http.port}/api/streams`, (error, response, body) => {
        const streams = JSON.parse(body)['live'];
        if (typeof streams !== undefined) {
            for (let stream in streams) {
                if (streams.hasOwnProperty(stream)) {
                    helpers.generateStreamThumbnail(stream);
                }
            }
        }
    });
}, null, true);

module.exports = job;