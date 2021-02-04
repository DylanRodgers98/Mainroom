const {CronJob} = require('cron');
const config = require('../../mainroom.config');
const {User} = require('../model/schemas');
const mainroomEventEmitter = require('../mainroomEventEmitter');
const LOGGER = require('../../logger')('./server/cron/newSubscribersEmailer.js');

const jobName = 'New Subscribers Emailer';

let lastTimeTriggered = Date.now();

const job = new CronJob(config.cron.newSubscribersEmailer, async () => {
    LOGGER.debug(`${jobName} triggered`);

    const thisTimeTriggered = job.lastDate().valueOf();

    if (!config.email.enabled) {
        LOGGER.info('Email is not enabled, so will not send emails about subscription-created scheduled streams');
    } else {
        try {
            const filter = {
                'emailSettings.newSubscribers': true,
                $and: [
                    {'subscribers.subscribedAt': {$gt: lastTimeTriggered}},
                    {'subscribers.subscribedAt': {$lte: thisTimeTriggered}}
                ]
            };

            const users = await User.find(filter)
                .select('username displayName email subscribers')
                .populate({
                    path: 'subscribers.user',
                    select: 'username displayName profilePicURL'
                })
                .exec();

            if (!users.length) {
                LOGGER.info('No Users with new subscribers between {} and {}, so sending no emails',
                    lastTimeTriggered, thisTimeTriggered);
            } else {
                LOGGER.info('Emitting requests to send emails to {} user{} about new subscribers',
                    users.length, users.length === 1 ? '' : 's');

                for (const user of users) {
                    const subscribers = user.subscribers.map(sub => sub.user);
                    mainroomEventEmitter.emit('onNewSubscribers', user, subscribers);
                }
            }
        } catch (err) {
            LOGGER.error('An error occurred when emitting requests to email users about new subscribers: {}', err);
            throw err;
        }
    }

    lastTimeTriggered = thisTimeTriggered;

    LOGGER.debug(`${jobName} finished`);
});

module.exports = {jobName, job};