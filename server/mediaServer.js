const NodeMediaServer = require('node-media-server');
const config = require('../mainroom.config');
const User = require('./model/schemas').User;
const emailEventEmitter = require('./emailEventEmitter');
const LOGGER = require('../logger')('./server/mediaServer.js');

const nms = new NodeMediaServer(config.rtmpServer);

nms.on('prePublish', async (id, streamPath) => {
    const streamKey = getStreamKeyFromStreamPath(streamPath);
    User.findOne({"streamInfo.streamKey": streamKey})
        .select('streamInfo.streamKey username displayName subscribers profilePicURL')
        .populate({
            path: 'subscribers',
            select: 'username displayName email emailSettings'
        })
        .exec((err, user) => {
            if (err) {
                LOGGER.error('An error occurred during prePublish event for stream [session ID: {}, stream key: {}]', id, streamKey);
            } else if (!user) {
                LOGGER.info('A stream session (ID: {}) was rejected because no user exists with stream key {}', id, streamKey);
                nms.getSession(id).reject();
            } else {
                emailEventEmitter.emit('onWentLive', user);
            }
        });
});

const getStreamKeyFromStreamPath = (path) => {
    const parts = path.split('/');
    return parts[parts.length - 1];
};

module.exports = nms;
