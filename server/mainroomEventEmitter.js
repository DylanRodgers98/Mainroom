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
        .on('onCreateScheduledStream', sesEmailSender.notifyUserSubscriptionsCreatedScheduledStreams)
        .on('onScheduledStreamStartingSoon', sesEmailSender.notifyUserOfSubscriptionsStreamsStartingSoon);
}

mainroomEventEmitter.on('error', err => {
    LOGGER.error('An error event was emitted: {}', err);
});

mainroomEventEmitter.on('onWentLive', user => {
    // notify socket.io
    mainroomEventEmitter.emit(`onWentLive_${user.username}`);
});

mainroomEventEmitter.on('onStreamEnded', user => {
    // notify socket.io
    mainroomEventEmitter.emit(`onStreamEnded_${user.username}`);
});

module.exports = mainroomEventEmitter;
