const config = require('../mainroom.config');
const EventEmitter = require('events');
const sesEmailSender = require('./aws/sesEmailSender');

class EmailEventEmitter extends EventEmitter {}

const emailEventEmitter = new EmailEventEmitter();

if (config.email.enabled) {
    emailEventEmitter
        .on('onNewSubscriber', sesEmailSender.notifyUserOfNewSubscriber)
        .on('onWentLive', sesEmailSender.notifySubscribersUserWentLive)
        .on('onCreateScheduledStream', sesEmailSender.notifySubscribersUserCreatedScheduledStream)
        .on('onScheduledStreamStartingSoon', sesEmailSender.notifyUserOfSubscriptionsStreamsStartingSoon);
}

module.exports = emailEventEmitter;