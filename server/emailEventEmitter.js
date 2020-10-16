const config = require('../mainroom.config');
const EventEmitter = require('events');
const sesEmailSender = require('./aws/sesEmailSender');
const LOGGER = require('../logger')('./server/emailEventEmitter.js');

class EmailEventEmitter extends EventEmitter {}

const emailEventEmitter = new EmailEventEmitter();

if (config.email.enabled) {
    emailEventEmitter
        .on('onNewSubscriber', sesEmailSender.notifyUserOfNewSubscriber)
        .on('onWentLive', sesEmailSender.notifySubscribersUserWentLive)
        .on('onCreateScheduledStream', sesEmailSender.notifySubscribersUserCreatedScheduledStream)
        .on('onScheduledStreamStartingSoon', sesEmailSender.notifyUserOfSubscriptionsStreamsStartingSoon);
}

emailEventEmitter.on('error', err => {
    LOGGER.error('An error event was emitted: {}', err);
});

module.exports = emailEventEmitter;