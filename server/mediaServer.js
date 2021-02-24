const NodeMediaServer = require('node-media-server');
const config = require('../mainroom.config');
const {User, RecordedStream} = require('./model/schemas');
const mainroomEventBus = require('./mainroomEventBus');
const {generateStreamThumbnail} = require('../server/aws/s3ThumbnailGenerator');
const {uploadVideoToS3} = require('../server/aws/s3VideoUploader');
const path = require('path');
const fs = require('fs').promises;
const sesEmailSender = require('./aws/sesEmailSender');
const CompositeError = require('./errors/CompositeError');
const {spawn} = require('child_process');
const LOGGER = require('../logger')('./server/mediaServer.js');

const EXPECTED_APP_NAME = `/${process.env.RTMP_SERVER_APP_NAME}`;
const IS_RECORDING_TO_MP4 = config.rtmpServer.trans.tasks.some(task => task.mp4);

const nms = new NodeMediaServer(config.rtmpServer);

nms.on('prePublish', async (sessionId, streamPath) => {
    const {app, streamKey} = extractAppAndStreamKey(streamPath);
    if (app !== EXPECTED_APP_NAME) {
        nms.getSession(sessionId).reject();
        LOGGER.info(`A stream session (ID: {}) was rejected because it was targeting the wrong app ('{}' instead of '{}')`,
            sessionId, app, EXPECTED_APP_NAME);
    } else {
        let user;
        try {
            const query = User.findOne({'streamInfo.streamKey': streamKey})
            let select = 'username streamInfo.viewCount';
            if (config.email.enabled) {
                // retrieve fields required for sending email
                select += ' displayName subscribers profilePicURL';
                query.populate({
                    path: 'subscribers.user',
                    select: 'username displayName email emailSettings'
                });
            }
            user = await query.select(select).exec();
        } catch (err) {
            LOGGER.error('An error occurred when finding user with stream key {}: {}', streamKey, err);
            throw err;
        }

        if (!user) {
            nms.getSession(sessionId).reject();
            LOGGER.info('A stream session (ID: {}) was rejected because no user exists with stream key {}',
                sessionId, streamKey);
        } else {
            try {
                // reset view counts before starting stream. These are updated using WebSockets
                user.streamInfo.viewCount = 0;
                user.streamInfo.cumulativeViewCount = 0;
                await user.save();
            } catch (err) {
                LOGGER.error('An error occurred when updating cumulative view count for user (username: {}): {}',
                    user.username, err);
                throw err;
            }

            mainroomEventBus.send('streamStarted', user.username);
            if (config.email.enabled) {
                sesEmailSender.notifySubscribersUserWentLive(user);
            }
        }
    }
});

nms.on('donePublish', async (sessionId, streamPath) => {
    const {streamKey} = extractAppAndStreamKey(streamPath);

    let user;
    try {
        user = await User.findOne({'streamInfo.streamKey': streamKey})
            .select('_id username streamInfo.streamKey streamInfo.title streamInfo.genre streamInfo.category streamInfo.tags streamInfo.cumulativeViewCount')
            .exec();
    } catch (err) {
        LOGGER.error('An error occurred when finding user with stream key {}: {}', streamKey, err);
        throw err;
    }

    if (!user) {
        LOGGER.info('Could not find user with stream key {}', streamKey);
    } else {
        mainroomEventBus.send('streamEnded', user.username);

        if (IS_RECORDING_TO_MP4) {
            const inputDirectory = path.join(process.cwd(), config.rtmpServer.http.mediaroot, process.env.RTMP_SERVER_APP_NAME, streamKey);
            const timestamp = getSessionConnectTime(sessionId);
            const mp4FileName = await findMP4FileName(inputDirectory, timestamp);
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

                const promiseResults = await Promise.all([
                    videoDurationPromise,
                    uploadVideoPromise,
                    generateThumbnailPromise
                ]);

                const videoDuration = promiseResults[0];
                const {originalFileURLs, videoURL} = promiseResults[1];
                const thumbnailURL = promiseResults[2];

                const recordedStream = new RecordedStream({
                    user: user._id,
                    title: user.streamInfo.title || 'Untitled Stream',
                    genre: user.streamInfo.genre,
                    category: user.streamInfo.category,
                    tags: user.streamInfo.tags,
                    viewCount: user.streamInfo.cumulativeViewCount,
                    timestamp,
                    videoDuration,
                    videoURL,
                    thumbnailURL
                });

                await Promise.allSettled([...originalFileURLs.map(deleteFile), recordedStream.save()]);
                const rejectedPromises = promiseResults.filter(res => res.status === 'rejected');
                if (rejectedPromises.length) {
                    throw new CompositeError(rejectedPromises.map(promise => promise.reason));
                }
            } catch (err) {
                LOGGER.error('An error occurred when uploading recorded stream at {} to S3 (bucket: {}, key: {}): {}',
                    inputURL, Bucket, Key, err);
                throw err;
            }
        }
    }
});

const extractAppAndStreamKey = path => {
    const parts = path.split('/');
    const removedElements = parts.splice(parts.length - 1, 1);
    return {
        app: parts.join('/'),
        streamKey: removedElements[0]
    };
};

function getSessionConnectTime(sessionId) {
    return nms.getSession(sessionId).connectTime;
}

async function findMP4FileName(inputDirectory, sessionConnectTime) {
    LOGGER.debug('Looking for MP4 files in {}', inputDirectory);

    const fileNames = await fs.readdir(inputDirectory);
    LOGGER.debug('All files found: {}', fileNames);

    const mp4FileNames = fileNames.filter(fileName => path.extname(fileName).toLowerCase() === '.mp4');
    LOGGER.debug('MP4 files found: {}', mp4FileNames);

    if (mp4FileNames.length === 1) {
        return mp4FileNames[0];
    } else {
        LOGGER.error('{} MP4 files found in {} but expected 1', mp4FileNames.length, inputDirectory);
        LOGGER.info('Attempting to find MP4 file comparing file creation times against session connect time of {}', sessionConnectTime);

        const possibleMp4FileNames = [];
        const deletePromises = []

        for (const filename of mp4FileNames) {
            const filePath = path.join(inputDirectory, filename);
            const { birthtimeMs } = await fs.stat(filePath);
            if (birthtimeMs < sessionConnectTime) {
                deletePromises.push(deleteFile(filePath));
            } else {
                possibleMp4FileNames.push(filename)
                LOGGER.info('Found possible MP4 file for stream: {}', filename);
            }
        }

        if (deletePromises.length) {
            await Promise.all(deletePromises);
        }

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

async function deleteFile(filePath) {
    try {
        LOGGER.info('Deleting file at {}', filePath);
        await fs.unlink(filePath);
        LOGGER.info('Successfully deleted file at {}', filePath);
    } catch (err) {
        LOGGER.error('An error occurred when deleting file at {}: {}', filePath, err);
        throw err;
    }
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
            LOGGER.debug('stderr: {}', data)
        });
        ffprobe.stdout.on('data', data => {
            const durationString = data.toString();
            const indexOfMillis = durationString.indexOf('.')
            resolve(durationString.substring(0, indexOfMillis));
        });
    });
}

module.exports = nms;
