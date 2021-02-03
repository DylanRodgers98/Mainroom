const {CronJob} = require('cron');
const config = require('../../mainroom.config');
const {ScheduledStream, User} = require('../model/schemas');
const mainroomEventEmitter = require('../mainroomEventEmitter');
const LOGGER = require('../../logger')('./server/cron/createdScheduledStreamsEmailer.js');

const jobName = 'Subscription-created Scheduled Streams Emailer'

let lastTimeTriggered = Date.now();

const job = new CronJob(config.cron.createdScheduledStreamsEmailer, async () => {
    LOGGER.debug(`${jobName} triggered`);

    const thisTimeTriggered = job.lastDate().valueOf();

    if (!config.email.enabled) {
        LOGGER.info('Email is not enabled, so will not send emails about newly created scheduled streams');
    } else {
        try {
            const filter = {
                $and: [
                    {createdAt: {$gt: lastTimeTriggered}},
                    {createdAt: {$lte: thisTimeTriggered}}
                ]
            };
            const scheduledStreams = await ScheduledStream.find(filter)
                .select('user title startTime endTime genre category')
                .populate({
                    path: 'user',
                    select: '_id username displayName profilePicURL'
                })
                .exec();

            if (!scheduledStreams.length) {
                LOGGER.info('No streams found starting between {} and {}, so sending no emails', lastTimeTriggered, thisTimeTriggered);
            } else {
                const userIds = scheduledStreams.map(stream => stream.user._id);
                const users = await User.find({subscriptions: {$in: userIds}})
                    .select('username displayName email subscriptions')
                    .exec()

                for (const user of users) {
                    const subscribedStreams = scheduledStreams.filter(stream => user.subscriptions.includes(stream.user._id));
                    mainroomEventEmitter.emit('onCreateScheduledStream', user, subscribedStreams);
                }
            }
        } catch (err) {
            LOGGER.error('An error occurred when finding users to email about newly created scheduled streams from subscriptions: {}', err);
            throw err;
        }
    }

    lastTimeTriggered = thisTimeTriggered;

    LOGGER.debug(`${jobName} finished`);
});

module.exports = {jobName, job};