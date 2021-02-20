const EventEmitter = require('events');
const pm2 = require('pm2');
const LOGGER = require('../logger')('./server/mainroomEventBus.js');

const PROCESS_ID = parseInt(process.env.NODE_APP_INSTANCE);

class MainroomEventBus extends EventEmitter {

    send(event, args) {
        const data = args || {};
        if (process.env.NODE_ENV === 'production') {
            // in production environment, send event to pm2 God process so it can notify all child processes
            LOGGER.debug(`Sending '{}' event to pm2 God process`, event);
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
        } else {
            this.emit(event, data);
        }
    }

}

const mainroomEventBus = new MainroomEventBus();

mainroomEventBus.on('error', err => {
    LOGGER.error('An error event was emitted: {}', err);
});

module.exports = mainroomEventBus;
