const {EOL} = require('os');

class CompositeError extends Error {
    constructor(errors) {
        let message = `Multiple errors occurred:${EOL}`;
        errors.forEach(err => message += err.toString() + EOL);
        super(message);
        this.name = 'CompositeError';
    }
}

module.exports = CompositeError;