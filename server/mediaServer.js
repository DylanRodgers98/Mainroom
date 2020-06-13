const NodeMediaServer = require('node-media-server');
const config = require('./config/default').rtmp_server;
const User = require('./database/Schema').User;
const helpers = require('./helpers/helpers');

nms = new NodeMediaServer(config);

nms.on('prePublish', async (id, StreamPath, args) => {
    const stream_key = getStreamKeyFromStreamPath(StreamPath);
    console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);

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
