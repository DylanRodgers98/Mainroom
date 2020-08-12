const NodeMediaServer = require('node-media-server');
const config = require('../mainroom.config');
const User = require('./database/schemas').User;
const helpers = require('./helpers/thumbnailGenerator');
const LOGGER = require('node-media-server/node_core_logger');

const nms = new NodeMediaServer(config.rtmpServer);

nms.on('prePublish', async (id, streamPath, args) => {
    LOGGER.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${streamPath} args=${JSON.stringify(args)}`);
    const streamKey = getStreamKeyFromStreamPath(streamPath);
    User.findOne({
        streamInfo: {
            streamKey: streamKey
        }
    }, (err, user) => {
        if (!err) {
            if (!user) {
                let session = nms.getSession(id);
                session.reject();
            } else {
                helpers.generateStreamThumbnail(streamKey);
            }
        }
    });
});

const getStreamKeyFromStreamPath = (path) => {
    const parts = path.split('/');
    return parts[parts.length - 1];
};

module.exports = nms;
