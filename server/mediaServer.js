const NodeMediaServer = require('node-media-server');
const config = require('./config/default').rtmp_server;
const User = require('./database/schema').User;
const helpers = require('./helpers/helpers');
const LOGGER = require('node-media-server/node_core_logger');

nms = new NodeMediaServer(config);

nms.on('prePublish', async (id, streamPath, args) => {
    LOGGER.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${streamPath} args=${JSON.stringify(args)}`);
    const stream_key = getStreamKeyFromStreamPath(streamPath);
    User.findOne({stream_key: stream_key}, (err, user) => {
        if (!err) {
            if (!user) {
                let session = nms.getSession(id);
                session.reject();
            } else {
                helpers.generateStreamThumbnail(stream_key);
            }
        }
    });
});

const getStreamKeyFromStreamPath = (path) => {
    const parts = path.split('/');
    return parts[parts.length - 1];
};

module.exports = nms;
