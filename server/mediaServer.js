const NodeMediaServer = require('node-media-server');
const config = require('../mainroom.config');
const {User, RecordedStream} = require('./model/schemas');
const mainroomEventEmitter = require('./mainroomEventEmitter');
const moment = require('moment');
const AWS = require('aws-sdk');
const {generateStreamThumbnail} = require('../server/aws/s3ThumbnailGenerator');
const {uploadVideoToS3} = require('../server/aws/s3VideoUploader');
const LOGGER = require('../logger')('./server/mediaServer.js');

const isRecordingToMP4 = config.rtmpServer.trans.tasks.some(task => task.mp4);

const S3 = new AWS.S3();
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
                const recordedStreamURL = `http://${config.rtmpServer.host}:${config.rtmpServer.http.port}/live/${streamKey}/index.m3u8`;
                const Bucket = config.storage.s3.streams.bucketName;
                const videoFileName = getVideoFileName(sessionId);
                const recordedStreamKey = `${streamPath}/${videoFileName}.mp4`;
                const destinationKey = `${config.storage.s3.streams.keyPrefixes.recorded}/${user._id}/${videoFileName}`;

                const videoURL = await uploadVideoToS3({
                    inputURL: recordedStreamURL,
                    Bucket,
                    Key: `${destinationKey}.mp4`
                });

                S3.deleteObject({Bucket, Key: recordedStreamKey}, err => {
                    if (err) {
                        LOGGER.error('An error occurred when deleting object in S3 (bucket: {}, key: {}): {}', Bucket, recordedStreamKey, err);
                        throw err;
                    }
                });

                const thumbnailURL = await generateStreamThumbnail({
                    inputURL: videoURL,
                    Bucket,
                    Key: `${destinationKey}.jpg`
                });

                RecordedStream.findOneAndUpdate({user, videoURL: null}, {videoURL, thumbnailURL}, err => {
                    if (err) {
                        LOGGER.error('An error occurred when updating RecordedStream: {}', err);
                        throw err;
                    }
                });
            }
        });
    }
});

const getStreamKeyFromStreamPath = path => {
    const parts = path.split('/');
    return parts[parts.length - 1];
};

const getSessionConnectTime = sessionId => nms.getSession(sessionId).connectTime;

const getVideoFileName = sessionId => moment(getSessionConnectTime(sessionId)).format('yyyy-MM-DD-HH-mm-ss');

module.exports = nms;
