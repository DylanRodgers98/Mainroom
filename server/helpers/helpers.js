const spawn = require('child_process').spawn;
const config = require('../config/default');

const generateStreamThumbnail = (streamKey) => {
    const ffmpeg = config.rtmpServer.trans.ffmpeg;
    const args = [
        '-y',
        '-i', `http://127.0.0.1:8888/live/${streamKey}/index.m3u8`,
        '-ss', '00:00:01',
        '-vframes', '1',
        '-vf', 'scale=-2:300',
        `server/thumbnails/${streamKey}.png`,
    ];

    spawn(ffmpeg, args, {
        detached: true,
        stdio: 'ignore'
    }).unref();
};

module.exports = {
    generateStreamThumbnail: generateStreamThumbnail
};

