const LOGGER = require('node-media-server/node_core_logger');

class Logger {
    constructor(fileName) {
        this.fileName = fileName;
    }

    log(args) {
        LOGGER.log(`[${this.fileName}]`, args);
    }

    error(args) {
        LOGGER.error(`[${this.fileName}]`, args);
    }

    debug(args) {
        LOGGER.debug(`[${this.fileName}]`, args);
    }

    ffdebug(args) {
        LOGGER.ffdebug(`[${this.fileName}]`, args);
    }
}

module.exports = fileName => {
    return new Logger(fileName);
}