const config = require('../mainroom.config');
const EventEmitter = require('events');
const sesEmailSender = require('./aws/sesEmailSender');
const pm2 = require('pm2');
const LOGGER = require('../logger')('./server/mainroomEventEmitter.js');

const PROCESS_ID = parseInt(process.env.NODE_APP_INSTANCE);

class MainroomEventEmitter extends EventEmitter { }

const mainroomEventEmitter = new MainroomEventEmitter();

if (config.email.enabled) {
    mainroomEventEmitter
        .on('onNewSubscribers', sesEmailSender.notifyUserOfNewSubscribers)
        .on('onWentLive', sesEmailSender.notifySubscribersUserWentLive)
        .on('onSubscriptionsCreatedScheduledStreams', sesEmailSender.notifyUserSubscriptionsCreatedScheduledStreams)
        .on('onScheduledStreamStartingSoon', sesEmailSender.notifyUserOfSubscriptionsStreamsStartingSoon);
}

mainroomEventEmitter.on('error', err => {
    LOGGER.error('An error event was emitted: {}', err);
});

mainroomEventEmitter.on('onWentLive', user => {
    // notify socket.io
    if (process.env.NODE_ENV === 'production') {
        // in production environment, send event to pm2 God process
        // so it can notify all child processes
        pm2.sendDataToProcessId(PROCESS_ID, {
            id: PROCESS_ID,
            topic: 'mainroom',
            type: `onWentLive_${user.username}`,
            data: {
                username: user.username
            }
        }, err => {
            if (err) {
                throw err;
            }
        });
    } else {
        mainroomEventEmitter.emit(`onWentLive_${user.username}`);
    }
});

mainroomEventEmitter.on('onStreamEnded', user => {
    // notify socket.io
    if (process.env.NODE_ENV === 'production') {
        // in production environment, send event to pm2 God process
        // so it can notify all child processes
        pm2.sendDataToProcessId(PROCESS_ID, {
            id: PROCESS_ID,
            topic: 'mainroom',
            type: `onStreamEnded_${user.username}`,
            data: {
                username: user.username
            }
        }, err => {
            if (err) {
                throw err;
            }
        });
    } else {
        mainroomEventEmitter.emit(`onStreamEnded_${user.username}`);
    }
});

module.exports = mainroomEventEmitter;
