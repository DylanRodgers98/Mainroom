const config = require('../../mainroom.config');
const CompositeError = require('../errors/CompositeError');
const { SESClient, SendTemplatedEmailCommand, SendBulkTemplatedEmailCommand } = require('@aws-sdk/client-ses');
const snsErrorPublisher = require('./snsErrorPublisher');
const LOGGER = require('../../logger')('./server/aws/sesEmailSender.js');

const SES_CLIENT = new SESClient({});
const BULK_EMAIL_MAX_DESTINATIONS = 50;

module.exports.notifyUserOfNewSubscribers = async (user, subscribers) => {
    const params = new SendTemplatedEmailCommand({
        Destination: {
            ToAddresses: [user.email]
        },
        Source: process.env.NO_REPLY_EMAIL,
        Template: config.email.ses.templateNames.newSubscribers,
        TemplateData: JSON.stringify({
            user: {
                displayName: user.displayName || user.username
            },
            newSubscribers: subscribers.map(subscriber => {
                return {
                    displayName: subscriber.displayName || subscriber.username,
                    username: subscriber.username,
                    profilePicURL: subscriber.getProfilePicURL()
                };
            })
        })
    });
    try {
        await SES_CLIENT.send(params);
    } catch (err) {
        if (err) {
            LOGGER.error(`An error occurred when sending 'newSubscriber' email to {} using SES: {}`,
                user.email, `${err.toString()}\n${err.stack}`);
            await snsErrorPublisher.publish(err);
        } else {
            LOGGER.debug(`Successfully sent 'newSubscriber' email to {} using SES`, user.email);
        }
    }
}

module.exports.notifySubscribersUserWentLive = async user => {
    const subscribers = user.subscribers.map(sub => sub.user._id);
    const emailType = 'subscriptionWentLive';
    const destinations = getDestinations(subscribers, emailType);

    if (destinations.length) {
        const errors = [];
        const splits = splitDestinations(destinations);

        const sIfMultipleSplits = splits.length === 1 ? '' : 's';
        LOGGER.info(`Sending {} bulk '{}' email{}`, splits.length, emailType, sIfMultipleSplits);

        for (let i = 0; i < splits.length; i++) {
            const params = new SendBulkTemplatedEmailCommand({
                Destinations: splits[i],
                Source: process.env.NO_REPLY_EMAIL,
                Template: config.email.ses.templateNames[emailType],
                DefaultTemplateData: JSON.stringify({
                    user: {
                        displayName: user.displayName || user.username,
                        username: user.username,
                        profilePicURL: user.getProfilePicURL()
                    }
                })
            });
            try {
                await SES_CLIENT.send(params);
            } catch (err) {
                if (err) {
                    LOGGER.error(`An error occurred when sending bulk '{}' email {} using SES: {}`, i + 1, emailType, err);
                    errors.push(err);
                } else {
                    LOGGER.debug(`Successfully sent bulk '{}' email {} using SES`, i + 1, emailType);
                }
            }
        }
        if (errors.length) {
            const err = new CompositeError(errors);
            LOGGER.error(`{} out of {} bulk '{}' email{} failed to send. Error: {}`,
                errors.length, splits.length, emailType, sIfMultipleSplits, `${err.toString()}\n${err.stack}`);
            await snsErrorPublisher.publish(err);
        }
    }
}

function getDestinations(users, emailType) {
    const destinations = [];
    for (const user of users) {
        if (user.emailSettings[emailType]) {
            destinations.push({
                Destination: {
                    ToAddresses: user.email
                },
                ReplacementTemplateData: JSON.stringify({
                    subscriber: {
                        displayName: user.displayName || user.username
                    }
                })
            });
        }
    }
    return destinations;
}

function splitDestinations(destinations) {
    const splits = [];
    for (let i = 0; i < destinations.length; i += BULK_EMAIL_MAX_DESTINATIONS) {
        splits.push(destinations.slice(i, i + BULK_EMAIL_MAX_DESTINATIONS));
    }
    return splits;
}

module.exports.notifyUserSubscriptionsCreatedScheduledStreams = async (user, streams) => {
    const params = new SendTemplatedEmailCommand({
        Destination: {
            ToAddresses: [user.email]
        },
        Source: process.env.NO_REPLY_EMAIL,
        Template: config.email.ses.templateNames.subscriptionsCreatedScheduledStreams,
        TemplateData: JSON.stringify({
            user: {
                displayName: user.displayName || user.username
            },
            streams: streams.map(stream => {
                return {
                    user: {
                        displayName: stream.user.displayName || stream.user.username,
                        username: stream.user.username,
                        profilePicURL: stream.user.getProfilePicURL()
                    },
                    stream: {
                        title: stream.title,
                        startTime: stream.startTime,
                        endTime: stream.endTime,
                        genre: stream.genre,
                        category: stream.category
                    },
                }
            })
        })
    });
    try {
        await SES_CLIENT.send(params);
    } catch (err) {
        if (err) {
            LOGGER.error(`An error occurred when sending 'subscriptionsCreatedScheduledStreams' email to {} using SES: {}`,
                user.email, `${err.toString()}\n${err.stack}`);
            await snsErrorPublisher.publish(err);
        } else {
            LOGGER.debug(`Successfully sent 'subscriptionsCreatedScheduledStreams' email to {} using SES`, user.email);
        }
    }
}

module.exports.notifyUserOfSubscriptionsStreamsStartingSoon = async (user, streams) => {
    const params = new SendTemplatedEmailCommand({
        Destination: {
            ToAddresses: [user.email]
        },
        Source: process.env.NO_REPLY_EMAIL,
        Template: config.email.ses.templateNames.subscriptionScheduledStreamStartingIn,
        TemplateData: JSON.stringify({
            user: {
                displayName: user.displayName || user.username
            },
            streams: streams.map(stream => {
                return {
                    user: {
                        displayName: stream.user.displayName || stream.user.username,
                        username: stream.user.username,
                        profilePicURL: stream.user.getProfilePicURL()
                    },
                    stream: {
                        title: stream.title,
                        startTime: stream.startTime,
                        endTime: stream.endTime,
                        genre: stream.genre,
                        category: stream.category
                    },
                }
            })
        })
    });
    try {
        await SES_CLIENT.send(params);
    } catch (err) {
        if (err) {
            LOGGER.error(`An error occurred when sending 'subscriptionScheduledStreamStartingIn' email to {} using SES: {}`,
                user.email, `${err.toString()}\n${err.stack}`);
            await snsErrorPublisher.publish(err);
        } else {
            LOGGER.debug(`Successfully sent 'subscriptionScheduledStreamStartingIn' email to {} using SES`, user.email);
        }
    }
}

module.exports.sendResetPasswordEmail = async (user, token) => {
    const params = new SendTemplatedEmailCommand({
        Destination: {
            ToAddresses: [user.email]
        },
        Source: process.env.NO_REPLY_EMAIL,
        Template: config.email.ses.templateNames.resetPassword,
        TemplateData: JSON.stringify({
            user: {
                displayName: user.displayName || user.username
            },
            token
        })
    });
    try {
        await SES_CLIENT.send(params);
    } catch (err) {
        if (err) {
            LOGGER.error(`An error occurred when sending 'resetPassword' email to {} using SES: {}`,
                user.email, `${err.toString()}\n${err.stack}`);
            await snsErrorPublisher.publish(err);
        } else {
            LOGGER.debug(`Successfully sent 'resetPassword' email to {} using SES`, user.email);
        }
    }
}

module.exports.sendWelcomeEmail = async (email, username) => {
    const params = new SendTemplatedEmailCommand({
        Destination: {
            ToAddresses: [email]
        },
        Source: process.env.NO_REPLY_EMAIL,
        Template: config.email.ses.templateNames.welcomeNewUser,
        TemplateData: JSON.stringify({username})
    });
    try {
        await SES_CLIENT.send(params);
    } catch (err) {
        if (err) {
            LOGGER.error(`An error occurred when sending 'welcomeNewUser' email to {} using SES: {}`,
                email, `${err.toString()}\n${err.stack}`);
            await snsErrorPublisher.publish(err);
        } else {
            LOGGER.debug(`Successfully sent 'resetPassword' email to {} using SES`, email);
        }
    }
}
