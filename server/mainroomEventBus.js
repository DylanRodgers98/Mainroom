const EventEmitter = require('events');
const pm2 = require('pm2');
const LOGGER = require('../logger')('./server/mainroomEventBus.js');

const PROCESS_ID = parseInt(process.env.NODE_APP_INSTANCE);

class MainroomEventBus extends EventEmitter {

    send(event, args) {
        if (process.env.NODE_ENV === 'production') {
            // in production environment, send event to pm2 God process so it can notify all child processes
            LOGGER.debug(`Sending '{}' event to pm2 God process`, event);
            this.sendToGodProcess(event, args);
        } else {
            LOGGER.debug(`Emitting '{}' event using EventEmitter`, event);
            this.emit(event, args);
        }
    }

    sendToGodProcess(event, args) {
        if (process.env.NODE_ENV !== 'production') {
            LOGGER.error(`Something tried to send an event of type '{}' to the pm2 God process, but the application is ` +
                'not in production mode. This event will be ignored.', event);
            return;
        }
        const data = args || {};
        pm2.sendDataToProcessId(PROCESS_ID, {
            id: PROCESS_ID,
            topic: 'mainroom',
            type: event,
            data
        }, err => {
            if (err) {
                LOGGER.error(`An error occurred when sending '{}' event to pm2 God process: {}`, event, err);
                throw err;
            }
        });
    }

}

const mainroomEventBus = new MainroomEventBus();

mainroomEventBus.on('error', err => {
    LOGGER.error('An error event was emitted: {}', err);
});

module.exports = mainroomEventBus;
