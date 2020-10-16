const EventEmitter = require('events');
const sesEmailSender = require('./aws/sesEmailSender');

class EmailEventEmitter extends EventEmitter {}

module.exports.emailEventEmitter = new EmailEventEmitter()
    .on('onNewSubscriber', sesEmailSender.notifyUserOfNewSubscriber)
    .on('onWentLive', sesEmailSender.notifySubscribersUserWentLive)
    .on('onCreateScheduledStream', sesEmailSender.notifySubscribersUserCreatedScheduledStream)
    .on('onScheduledStreamStartingSoon', sesEmailSender.notifyUserOfSubscriptionsStreamsStartingSoon);