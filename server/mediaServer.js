const NodeMediaServer = require('node-media-server');
const config = require('../mainroom.config');
const {User, RecordedStream} = require('./model/schemas');
const mainroomEventEmitter = require('./mainroomEventEmitter');
const moment = require('moment');
const {generateStreamThumbnail} = require('../server/aws/s3ThumbnailGenerator');
const {uploadVideoToS3} = require('../server/aws/s3VideoUploader');
const path = require('path');
const fs = require('fs');
const LOGGER = require('../logger')('./server/mediaServer.js');

const isRecordingToMP4 = config.rtmpServer.trans.tasks.some(task => task.mp4);

const nms = new NodeMediaServer(config.rtmpServer);

nms.on('prePublish', (sessionId, streamPath) => {
    const streamKey = getStreamKeyFromStreamPath(streamPath);
    User.findOne({'streamInfo.streamKey': streamKey})
        .select('_id streamInfo.streamKey streamInfo.title streamInfo.genre streamInfo.category username displayName subscribers profilePicURL')
        // populate subscribers for usage in mainroomEventEmitter
        .populate({
            path: 'subscribers',
            select: 'username displayName email emailSettings'
        })
        .exec((err, user) => {
            if (err) {
                LOGGER.error('An error occurred when finding user with stream key {}: {}', streamKey, err);
                throw err;
            } else if (!user) {
                nms.getSession(sessionId).reject();
                LOGGER.info('A stream session (ID: {}) was rejected because no user exists with stream key {}', sessionId, streamKey);
            } else {
                mainroomEventEmitter.emit('onWentLive', user);
                if (isRecordingToMP4) {
                    saveRecordedStreamDetails(user, sessionId);
                }
            }
        });
});

function saveRecordedStreamDetails(user, sessionId) {
    const recordedStream = new RecordedStream({
        user: user._id,
        timestamp: getSessionConnectTime(sessionId),
        title: user.streamInfo.title,
        genre: user.streamInfo.genre,
        category: user.streamInfo.category
    });
    recordedStream.save(err => {
        if (err) {
            LOGGER.error('An error occurred when saving new RecordedStream: {}, Error: {}', JSON.stringify(recordedStream), err);
            throw err;
        }
    });
}

nms.on('donePublish', (sessionId, streamPath) => {
    if (isRecordingToMP4) {
        const streamKey = getStreamKeyFromStreamPath(streamPath);
        User.findOne({'streamInfo.streamKey': streamKey}, '_id', async (err, user) => {
            if (err) {
                LOGGER.error('An error occurred when finding user with stream key {}: {}', streamKey, err);
            } else if (!user) {
                LOGGER.info('Could not find user with stream key {}', streamKey);
            } else {
                const inputDirectory = path.join(process.cwd(), config.rtmpServer.http.mediaroot, 'live', streamKey);
                const mp4FileName = findMP4FileName(inputDirectory, sessionId);
                const inputURL = path.join(inputDirectory, mp4FileName);
                const Bucket = config.storage.s3.streams.bucketName;
                const Key = `${config.storage.s3.streams.keyPrefixes.recorded}/${user._id}/${mp4FileName}`;

                try {
                    const videoURL = await uploadVideoToS3({inputURL, Bucket, Key});
                    const thumbnailURL = await generateStreamThumbnail({
                        inputURL,
                        Bucket,
                        Key: Key.replace('.mp4', '.jpg')
                    });

                    // delete original MP4 file
                    fs.unlinkSync(inputURL);

                    const timestamp = getSessionConnectTime(sessionId);
                    await RecordedStream.findOneAndUpdate(
                        {user, timestamp, videoURL: null},
                        {videoURL, thumbnailURL}
                    );
                } catch (err) {
                    LOGGER.error('An error occurred when uploading recorded stream at {} to S3 (bucket: {}, key: {}): {}', inputURL, Bucket, Key, err);
                    throw err;
                }
            }
        });
    }
});

const getStreamKeyFromStreamPath = path => {
    const parts = path.split('/');
    return parts[parts.length - 1];
};

function getSessionConnectTime(sessionId) {
    return nms.getSession(sessionId).connectTime;
}

function findMP4FileName(inputDirectory, sessionId) {
    const mp4FileNames = fs.readdirSync(inputDirectory)
        .filter(fileName => path.extname(fileName).toLowerCase() === '.mp4');

    if (mp4FileNames.length === 1) {
        return mp4FileNames[0];
    } else {
        LOGGER.error('{} MP4 files found in {} but expected 1', mp4FileNames.length, inputDirectory);
        LOGGER.info('Attempting to find MP4 file for stream (ID: {}) using formatted session connectTime', sessionId);
        const possibleMP4FileName = `${moment(getSessionConnectTime(sessionId)).format('yyyy-MM-DD-HH-mm-ss')}.mp4`;
        let mp4FileName;

        mp4FileNames.forEach(filename => {
            if (path.basename(filename) !== possibleMP4FileName) {
                LOGGER.info('Deleting {}', filename);
                fs.unlinkSync(filename);
            } else {
                mp4FileName = possibleMP4FileName;
                LOGGER.info('Found matching MP4 file for stream (ID: {}): {}', sessionId, mp4FileName);
            }
        });

        if (!mp4FileName) {
            LOGGER.error('No MP4 file could be found for stream with ID: {}', sessionId);
            throw new Error(`No MP4 file could be found for stream with ID: ${sessionId}`);
        }
        return mp4FileName;
    }
}

module.exports = nms;
