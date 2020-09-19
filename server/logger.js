const LOGGER = require('node-media-server/node_core_logger');

const FORMAT_SPECIFIER = '{}';

class Logger {
    constructor(fileName) {
        this.fileName = fileName;
    }

    info(format, ...args) {
        LOGGER.log(`[${this.fileName}]`, formatLogMessage(format, ...args));
    }

    error(format, ...args) {
        LOGGER.error(`[${this.fileName}]`, formatLogMessage(format, ...args));
    }

    debug(format, ...args) {
        LOGGER.debug(`[${this.fileName}]`, formatLogMessage(format, ...args));
    }
}

function formatLogMessage(format, ...args) {
    args.forEach(arg => format = format.replace(FORMAT_SPECIFIER, arg));
    return format;
}

module.exports = fileName => new Logger(fileName);