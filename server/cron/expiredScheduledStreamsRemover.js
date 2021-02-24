const CompositeError = require('../errors/CompositeError');
const {CronJob} = require('cron');
const {cronTime, storage} = require('../../mainroom.config');
const {ScheduledStream, User} = require('../model/schemas');
const LOGGER = require('../../logger')('./server/cron/expiredScheduledStreamsRemover.js');

const jobName = 'Expired ScheduledStreams Remover';

const job = new CronJob(cronTime.expiredScheduledStreamsRemover, async () => {
    LOGGER.debug(`${jobName} triggered`);

    try {
        const expiryTime = Date.now() - storage.scheduledStream.ttl;
        const streams = await ScheduledStream.find({endTime: {$lte: expiryTime}}).select('_id').exec();

        const promises = [];
        streams.forEach(stream => {
            const pullReferences = User.updateMany({nonSubscribedScheduledStreams: stream._id}, {$pull: {nonSubscribedScheduledStreams: stream._id}});
            const deleteStream = ScheduledStream.findByIdAndDelete(stream._id);
            promises.push(pullReferences, deleteStream);
        });

        const promiseResults = await Promise.allSettled(promises);
        const rejectedPromises = promiseResults.filter(res => res.status === 'rejected');
        if (rejectedPromises.length) {
            throw new CompositeError(rejectedPromises.map(promise => promise.reason));
        }
    } catch (err) {
        LOGGER.error('An error occurred when deleting ScheduledStreams past their TTL from database: {}', err);
        throw err;
    }

    LOGGER.debug(`${jobName} finished`);
});

module.exports = {jobName, job};