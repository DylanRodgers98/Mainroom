const config = require('../mainroom.config');
const EventEmitter = require('events');
const sesEmailSender = require('./aws/sesEmailSender');
const LOGGER = require('../logger')('./server/mainroomEventEmitter.js');

class MainroomEventEmitter extends EventEmitter { }

const mainroomEventEmitter = new MainroomEventEmitter();

if (config.email.enabled) {
    mainroomEventEmitter
        .on('onNewSubscriber', sesEmailSender.notifyUserOfNewSubscriber)
        .on('onWentLive', sesEmailSender.notifySubscribersUserWentLive)
        .on('onCreateScheduledStream', sesEmailSender.notifySubscribersUserCreatedScheduledStream)
        .on('onScheduledStreamStartingSoon', sesEmailSender.notifyUserOfSubscriptionsStreamsStartingSoon);
}

mainroomEventEmitter.on('error', err => {
    LOGGER.error('An error event was emitted: {}', err);
});

module.exports = mainroomEventEmitter;