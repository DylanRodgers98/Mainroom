const {CronJob} = require('cron');
const config = require('../../mainroom.config');
const {ScheduledStream, User} = require('../model/schemas');
const moment = require('moment');
const {emailEventEmitter} = require('../emailEventEmitter');
const LOGGER = require('../../logger')('./server/cron/scheduledStreamInfoUpdater.js');

const jobName = 'Upcoming Scheduled Stream Emailer';

const job = new CronJob(config.cron.upcomingScheduledStreamEmailer, () => {
    LOGGER.debug(`${jobName} triggered`);

    User.find({emailSettings: {subscriptionScheduledStreamStartingIn: {$gte: 0}}},
        'username displayName email emailSettings.subscriptionScheduledStreamStartingIn subscriptions',
        (err, users) => {
            if (err) {
                LOGGER.error('An error occurred when looking for users to email about streams starting soon: {}', err);
            } else {
                users.forEach(user => {
                    const startTime = moment().add(user.emailSettings.subscriptionScheduledStreamStartingIn, 'minutes').toDate();
                    ScheduledStream.find({user: {$in: user.subscriptions}, startTime})
                        .select('user title')
                        .populate({
                            path: 'user',
                            select: 'username displayName profilePicURL'
                        })
                        .exec((err, streams) => {
                            if (err) {
                                LOGGER.error('An error occurred when looking for streams starting soon: {}', err);
                            } else {
                                const userData = {
                                    email: user.email,
                                    displayName: user.displayName,
                                    username: user.username
                                };
                                emailEventEmitter.emit('onScheduledStreamStartingSoon', userData, streams);
                            }
                        });
                });
            }
        });
});

module.exports = {jobName, job};