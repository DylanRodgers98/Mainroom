const {CronJob} = require('cron');
const config = require('../../mainroom.config');
const {ScheduledStream, User} = require('../model/schemas');
const moment = require('moment');
const mainroomEventEmitter = require('../mainroomEventEmitter');
const CompositeError = require('../errors/CompositeError');
const LOGGER = require('../../logger')('./server/cron/upcomingScheduledStreamEmailer.js');

const jobName = 'Upcoming Scheduled Stream Emailer';

const job = new CronJob(config.cron.upcomingScheduledStreamEmailer, async () => {
    LOGGER.debug(`${jobName} triggered`);

    if (!config.email.enabled) {
        LOGGER.info('Email is not enabled, so will not send emails about upcoming scheduled streams');
    } else {
        let users;
        try {
            users = await User.find({emailSettings: {subscriptionScheduledStreamStartingIn: {$gte: 0}}})
                .select('username displayName email emailSettings.subscriptionScheduledStreamStartingIn subscriptions')
                .exec();
        } catch (err) {
            LOGGER.error('An error occurred when finding users to email about streams starting soon: {}', err);
            throw err;
        }

        const errors = [];
        for (const user of users) {
            try {
                // cron job should be configured to trigger every minute, so startTime needs to cover
                // streams that are scheduled for non-zero seconds (e.g. triggered at 1pm = 13:00:00-13:00:59)
                const start = moment().add(user.emailSettings.subscriptionScheduledStreamStartingIn, 'minutes').valueOf();
                const end = moment().add(user.emailSettings.subscriptionScheduledStreamStartingIn + 1, 'minutes').valueOf();

                const filter = {
                    user: {$in: user.subscriptions},
                    $and: [
                        {startTime: {$gte: start}},
                        {startTime: {$lt: end}}
                    ]
                };

                const streams = await ScheduledStream.find(filter)
                    .select('user title startTime endTime')
                    .populate({
                        path: 'user',
                        select: 'username displayName profilePicURL'
                    })
                    .exec();

                if (streams.length) {
                    const userData = {
                        email: user.email,
                        displayName: user.displayName,
                        username: user.username
                    };
                    mainroomEventEmitter.emit('onScheduledStreamStartingSoon', userData, streams);
                }
            } catch (err) {
                errors.push(err);
            }
        }
        if (errors.length) {
            LOGGER.error('{} error{} occurred when emailing users about streams starting soon',
                errors.length, errors.length === 1 ? '' : 's');
            throw new CompositeError(errors);
        }
    }

    LOGGER.debug(`${jobName} finished`);
});

module.exports = {jobName, job};