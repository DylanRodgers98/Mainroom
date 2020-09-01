const NodeMediaServer = require('node-media-server');
const config = require('../mainroom.config');
const User = require('./database/schemas').User;
const helpers = require('./helpers/thumbnailGenerator');

const nms = new NodeMediaServer(config.rtmpServer);

nms.on('prePublish', async (id, streamPath) => {
    const streamKey = getStreamKeyFromStreamPath(streamPath);
    User.findOne({
        "streamInfo.streamKey": streamKey
    }, (err, user) => {
        if (!err) {
            if (!user) {
                nms.getSession(id).reject();
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
