const config = require('../../mainroom.config');
const AWS = require('aws-sdk');
const LOGGER = require('../../logger')('./server/aws/sesEmailSender.js');

const SES = new AWS.SES();
const BULK_EMAIL_MAX_DESTINATIONS = 50;

module.exports.notifyUserOfNewSubscriber = async (user, subscriber) => {
    const params = {
        Destination: {
            ToAddresses: [user.email]
        },
        Source: process.env.NO_REPLY_EMAIL,
        Template: config.email.ses.templateNames.newSubscriber,
        TemplateData: JSON.stringify({
            user: {
                displayName: user.displayName || user.username
            },
            subscriber: {
                displayName: subscriber.displayName || subscriber.username,
                username: subscriber.username,
                profilePicURL: subscriber.profilePicURL
            }
        })
    };
    try {
        await SES.sendTemplatedEmail(params).promise();
    } catch (err) {
        if (err) {
            LOGGER.error(`An error occurred when sending 'newSubscriber' email to {} using SES: {}`, user.email, err);
        } else {
            LOGGER.debug(`Successfully sent 'newSubscriber' email to {} using SES`, user.email);
        }
    }
}

module.exports.notifySubscribersUserWentLive = user => {
    const subscribers = user.subscribers.map(sub => sub.user._id);
    const emailType = 'subscriptionWentLive';
    const destinations = getSubscriberDestinations(subscribers, emailType);

    if (destinations.length) {
        splitDestinations(destinations).forEach(async (Destinations, i) => {
            const params = {
                Destinations,
                Source: process.env.NO_REPLY_EMAIL,
                Template: config.email.ses.templateNames[emailType],
                DefaultTemplateData: JSON.stringify({
                    user: {
                        displayName: user.displayName || user.username,
                        username: user.username,
                        profilePicURL: user.profilePicURL
                    }
                })
            };
            try {
                await SES.sendBulkTemplatedEmail(params).promise();
            } catch (err) {
                if (err) {
                    LOGGER.error(`An error occurred when sending bulk '{}' email {} using SES: {}`, i + 1, emailType, err);
                } else {
                    LOGGER.debug(`Successfully sent bulk '{}' email {} using SES`, i + 1, emailType);
                }
            }
        });
    }
}

function getSubscriberDestinations(subscribers, emailType) {
    const destinations = [];
    subscribers.forEach(subscriber => {
        if (subscriber.emailSettings[emailType]) {
            destinations.push({
                Destination: {
                    ToAddresses: subscriber.email
                },
                ReplacementTemplateData: JSON.stringify({
                    subscriber: {
                        displayName: subscriber.displayName || subscriber.username
                    }
                })
            });
        }
    });
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
    const params = {
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
                        profilePicURL: stream.user.profilePicURL
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
    };
    try {
        await SES.sendTemplatedEmail(params).promise();
    } catch (err) {
        if (err) {
            LOGGER.error(`An error occurred when sending 'subscriptionsCreatedScheduledStreams' email to {} using SES: {}`, user.email, err);
        } else {
            LOGGER.debug(`Successfully sent 'subscriptionsCreatedScheduledStreams' email to {} using SES`, user.email);
        }
    }
}

module.exports.notifyUserOfSubscriptionsStreamsStartingSoon = async (user, streams) => {
    const params = {
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
                        profilePicURL: stream.user.profilePicURL
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
    };
    try {
        await SES.sendTemplatedEmail(params).promise();
    } catch (err) {
        if (err) {
            LOGGER.error(`An error occurred when sending 'subscriptionScheduledStreamStartingIn' email to {} using SES: {}`, user.email, err);
        } else {
            LOGGER.debug(`Successfully sent 'subscriptionScheduledStreamStartingIn' email to {} using SES`, user.email);
        }
    }
}

module.exports.sendResetPasswordEmail = async (user, token) => {
    const params = {
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
    };
    try {
        await SES.sendTemplatedEmail(params).promise();
    } catch (err) {
        if (err) {
            LOGGER.error(`An error occurred when sending 'resetPassword' email to {} using SES: {}`, user.email, err);
            throw err;
        } else {
            LOGGER.debug(`Successfully sent 'resetPassword' email to {} using SES`, user.email);
        }
    }
}