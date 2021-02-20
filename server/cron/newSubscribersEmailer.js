const {CronJob} = require('cron');
const config = require('../../mainroom.config');
const {User} = require('../model/schemas');
const sesEmailSender = require('../aws/sesEmailSender');
const CompositeError = require('../errors/CompositeError');
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
                    path: 'subscribers',
                    match: {
                        $and: [
                            {subscribedAt: {$gt: lastTimeTriggered}},
                            {subscribedAt: {$lte: thisTimeTriggered}}
                        ]
                    },
                    populate: {
                        path: 'user',
                        select: 'username displayName profilePicURL',
                    }
                })
                .exec();

            if (!users.length) {
                LOGGER.info('No Users with new subscribers between {} and {}, so sending no emails',
                    lastTimeTriggered, thisTimeTriggered);
            } else {
                const sIfMultipleUsers = users.length === 1 ? '' : 's';
                LOGGER.info('Creating request{} to send email{} to {} user{} about new subscribers',
                    sIfMultipleUsers, sIfMultipleUsers, users.length, sIfMultipleUsers);

                const promises = users.map(user => {
                    const subscribers = user.subscribers.map(sub => sub.user);
                    return sesEmailSender.notifyUserOfNewSubscribers(user, subscribers);
                });
                const promiseResults = await Promise.allSettled(promises);
                const rejectedPromises = promiseResults.filter(res => res.status === 'rejected');

                const sIfMultiplePromises = promises.length === 1 ? '' : 's';
                if (rejectedPromises.length) {
                    LOGGER.error('{} out of {} email{} failed to send',
                        rejectedPromises.length, promises.length, sIfMultiplePromises);
                    throw new CompositeError(rejectedPromises.map(promise => promise.reason));
                } else {
                    LOGGER.info('Successfully sent {} email{}', promises.length, sIfMultiplePromises);
                }
            }
        } catch (err) {
            LOGGER.error('An error occurred when creating requests to email users about new subscribers: {}', err);
            throw err;
        }
    }

    lastTimeTriggered = thisTimeTriggered;

    LOGGER.debug(`${jobName} finished`);
});

module.exports = {jobName, job};