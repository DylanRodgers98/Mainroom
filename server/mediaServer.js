const NodeMediaServer = require('node-media-server');
const config = require('../mainroom.config').rtmpServer;
const Stream = require('./database/schema').Stream;
const helpers = require('./helpers/helpers');
const LOGGER = require('node-media-server/node_core_logger');

nms = new NodeMediaServer(config);

nms.on('prePublish', async (id, streamPath, args) => {
    LOGGER.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${streamPath} args=${JSON.stringify(args)}`);
    const streamKey = getStreamKeyFromStreamPath(streamPath);
    Stream.findOne({streamKey: streamKey}, (err, user) => {
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
