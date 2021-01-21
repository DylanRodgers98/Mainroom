const NodeMediaServer = require('node-media-server');
const config = require('../mainroom.config');
const {User, RecordedStream} = require('./model/schemas');
const mainroomEventEmitter = require('./mainroomEventEmitter');
const {generateStreamThumbnail} = require('../server/aws/s3ThumbnailGenerator');
const {uploadVideoToS3} = require('../server/aws/s3VideoUploader');
const path = require('path');
const fs = require('fs');
const {spawn} = require('child_process');
const LOGGER = require('../logger')('./server/mediaServer.js');

const isRecordingToMP4 = config.rtmpServer.trans.tasks.some(task => task.mp4);

const nms = new NodeMediaServer(config.rtmpServer);

nms.on('prePublish', (sessionId, streamPath) => {
    const streamKey = getStreamKeyFromStreamPath(streamPath);
    User.findOne({'streamInfo.streamKey': streamKey})
        .select('username displayName subscribers profilePicURL')
        // populate subscribers for usage in mainroomEventEmitter
        .populate({
            path: 'subscribers',
            select: 'username displayName email emailSettings'
        })
        .exec(async (err, user) => {
            if (err) {
                LOGGER.error('An error occurred when finding user with stream key {}: {}', streamKey, err);
                throw err;
            } else if (!user) {
                nms.getSession(sessionId).reject();
                LOGGER.info('A stream session (ID: {}) was rejected because no user exists with stream key {}', sessionId, streamKey);
            } else {
                // set cumulative view count to number of users currently viewing stream page
                user.streamInfo.cumulativeViewCount = user.streamInfo.viewCount;
                await user.save();

                mainroomEventEmitter.emit('onWentLive', user);
            }
        });
});

nms.on('donePublish', (sessionId, streamPath) => {
    const streamKey = getStreamKeyFromStreamPath(streamPath);
    const timestamp = getSessionConnectTime(sessionId);

    User.findOne({'streamInfo.streamKey': streamKey})
        .select('_id username streamInfo.streamKey streamInfo.title streamInfo.genre streamInfo.category streamInfo.tags streamInfo.cumulativeViewCount')
        .exec(async (err, user) => {
            if (err) {
                LOGGER.error('An error occurred when finding user with stream key {}: {}', streamKey, err);
            } else if (!user) {
                LOGGER.info('Could not find user with stream key {}', streamKey);
            } else {
                mainroomEventEmitter.emit('onStreamEnded', user);

                if (isRecordingToMP4) {
                    const inputDirectory = path.join(process.cwd(), config.rtmpServer.http.mediaroot, 'live', streamKey);
                    const mp4FileName = findMP4FileName(inputDirectory, sessionId);
                    const inputURL = path.join(inputDirectory, mp4FileName);
                    const Bucket = config.storage.s3.streams.bucketName;
                    const Key = `${config.storage.s3.streams.keyPrefixes.recorded}/${user._id}/${mp4FileName}`;

                    try {
                        const videoDurationPromise = getVideoDurationString(inputURL);
                        const uploadVideoPromise = uploadVideoToS3({inputURL, Bucket, Key});
                        const generateThumbnailPromise = generateStreamThumbnail({
                            inputURL,
                            Bucket,
                            Key: Key.replace('.mp4', '.jpg')
                        });

                        const promiseResults = await Promise.all([videoDurationPromise, uploadVideoPromise, generateThumbnailPromise]);

                        const videoDuration = promiseResults[0];
                        const {originalFileURLs, videoURL} = promiseResults[1];
                        const thumbnailURL = promiseResults[2];

                        // delete original MP4 files
                        originalFileURLs.forEach(filePath => deleteFile(filePath));

                        const recordedStream = new RecordedStream({
                            user: user._id,
                            title: user.streamInfo.title,
                            genre: user.streamInfo.genre,
                            category: user.streamInfo.category,
                            tags: user.streamInfo.tags,
                            viewCount: user.streamInfo.cumulativeViewCount,
                            timestamp,
                            videoDuration,
                            videoURL,
                            thumbnailURL
                        });
                        await recordedStream.save();
                    } catch (err) {
                        LOGGER.error('An error occurred when uploading recorded stream at {} to S3 (bucket: {}, key: {}): {}', inputURL, Bucket, Key, err);
                        throw err;
                    }
                }
            }
    });
});

const getStreamKeyFromStreamPath = path => {
    const parts = path.split('/');
    return parts[parts.length - 1];
};

function getSessionConnectTime(sessionId) {
    return nms.getSession(sessionId).connectTime;
}

function findMP4FileName(inputDirectory, sessionConnectTime) {
    const mp4FileNames = fs.readdirSync(inputDirectory)
        .filter(fileName => path.extname(fileName).toLowerCase() === '.mp4');

    if (mp4FileNames.length === 1) {
        return mp4FileNames[0];
    } else {
        LOGGER.error('{} MP4 files found in {} but expected 1', mp4FileNames.length, inputDirectory);
        LOGGER.info('Attempting to find MP4 file comparing file creation times against session connect time of {}', sessionConnectTime);

        const possibleMp4FileNames = [];
        mp4FileNames.forEach(filename => {
            const filePath = path.join(inputDirectory, filename);
            const { birthtimeMs } = fs.statSync(filePath);
            if (birthtimeMs < sessionConnectTime) {
                deleteFile(filePath);
            } else {
                possibleMp4FileNames.push(filename)
                LOGGER.info('Found possible MP4 file for stream: {}', filename);
            }
        });

        if (possibleMp4FileNames.length !== 1) {
            const msg = `Expected 1 file in ${inputDirectory} to have creation time >= session connect time of ${sessionConnectTime}, but found ${possibleMp4FileNames.length}`
            LOGGER.error(msg);
            throw new Error(msg);
        }
        const mp4FileName = possibleMp4FileNames[0];
        LOGGER.info('Found matching MP4 file for stream: {}', mp4FileName);
        return mp4FileName;
    }
}

function deleteFile(filePath) {
    LOGGER.info('Deleting file at {}', filePath);
    fs.unlink(filePath, err => {
        if (err) {
            LOGGER.error('An error occurred when deleting file at {}: {}', filePath, err);
            throw err;
        } else {
            LOGGER.info('Successfully deleted file at {}', filePath);
        }
    });
}

function getVideoDurationString(inputURL) {
    return new Promise((resolve, reject) => {
        const args = ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', '-sexagesimal', inputURL];
        const ffprobe = spawn(process.env.FFPROBE_PATH, args);
        ffprobe.on('error', err => {
            LOGGER.error('An error occurred when getting video file duration for {}: {}', inputURL, err);
            reject(err);
        });
        ffprobe.stderr.on('data', data => {
            LOGGER.debug('The following data was piped from an FFPROBE child process to stderr: {}', data)
        });
        ffprobe.stdout.on('data', data => {
            const durationString = data.toString();
            const indexOfMillis = durationString.indexOf('.')
            resolve(durationString.substring(0, indexOfMillis));
        });
    });
}

module.exports = nms;
