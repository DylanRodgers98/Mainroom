const NodeMediaServer = require('node-media-server');
const config = require('../mainroom.config');
const {User, RecordedStream} = require('./model/schemas');
const mainroomEventEmitter = require('./mainroomEventEmitter');
const moment = require('moment');
const AWS = require('aws-sdk');
const {generateStreamThumbnail} = require('../server/aws/s3ThumbnailGenerator');
const LOGGER = require('../logger')('./server/mediaServer.js');

const isRecordingToMP4 = config.rtmpServer.trans.tasks.some(task => task.mp4);

const S3 = new AWS.S3();
const nms = new NodeMediaServer(config.rtmpServer);

nms.on('prePublish', (id, streamPath) => {
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
            } else if (!user) {
                nms.getSession(id).reject();
                LOGGER.info('A stream session (ID: {}) was rejected because no user exists with stream key {}', id, streamKey);
            } else {
                mainroomEventEmitter.emit('onWentLive', user);
                if (isRecordingToMP4) {
                    saveRecordedStreamDetails(user, id, streamPath);
                }
            }
        });
});

function saveRecordedStreamDetails(user, id, streamPath) {
    const bucket = config.storage.s3.streams.bucketName;
    const key = streamPath + '/' + getVideoFileName(id) + '.mp4';
    const videoURL = `https://${bucket}.s3.amazonaws.com/${key}`;

    const recordedStream = new RecordedStream({
        user: user._id,
        title: user.streamInfo.title,
        genre: user.streamInfo.genre,
        category: user.streamInfo.category,
        videoURL,
    });
    recordedStream.save(err => {
        if (err) {
            LOGGER.error('An error occurred when saving new RecordedStream: {}, Error: {}', JSON.stringify(recordedStream), err);
        }
    });
}

nms.on('donePublish', async (id, streamPath) => {
    if (isRecordingToMP4) {
        const videoFileName = getVideoFileName(id);
        const streamKey = getStreamKeyFromStreamPath(streamPath);

        const Bucket = config.storage.s3.streams.bucketName;
        const videoSourceKey = `${streamPath}/${videoFileName}.mp4`;
        const destinationKey = `${config.storage.s3.streams.keyPrefixes.recordedStreams}/${streamKey}/${videoFileName}`;
        const videoDestinationKey = `${destinationKey}.mp4`;

        await S3.copyObject({
            CopySource: `${Bucket}${videoSourceKey}`,
            Bucket,
            Key: videoDestinationKey
        }).promise();

        await S3.deleteObject({
            Bucket,
            Key: videoSourceKey
        }).promise();

        const videoURL = `https://${Bucket}.s3.amazonaws.com/${videoDestinationKey}`;
        const thumbnailURL = await generateStreamThumbnail({
            inputURL: videoURL,
            Bucket,
            Key: `${destinationKey}.jpg`
        });

        User.findOne({'streamInfo.streamKey': streamKey}, '_id', (err, user) => {
            if (err) {
                LOGGER.error('An error occurred when finding user with stream key {}: {}', streamKey, err);
            } else if (!user) {
                LOGGER.info('Could not find user with stream key {}', streamKey);
            } else {
                RecordedStream.findOneAndUpdate({user}, {videoURL, thumbnailURL}, (err, recordedStream) => {
                    if (err) {
                        LOGGER.error('An error occurred when updating RecordedStream: {}, Error: {}', JSON.stringify(recordedStream), err);
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

const getVideoFileName = id => {
    const sessionConnectTime = nms.getSession(id).connectTime;
    return moment(sessionConnectTime).format('yyyy-MM-DD-HH-mm-ss');
};

module.exports = nms;
