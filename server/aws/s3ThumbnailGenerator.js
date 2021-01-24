const config = require('../../mainroom.config');
const {spawn} = require('child_process');
const AWS = require('aws-sdk');
const S3 = new AWS.S3();
const s3UploadStream = require('s3-upload-stream')(S3);
const LOGGER = require('../../logger')('./server/aws/s3ThumbnailGenerator.js');

async function getThumbnail(streamKey) {
    const inputURL = `http://${process.env.RTMP_SERVER_HOST}:${process.env.RTMP_SERVER_HTTP_PORT}/live/${streamKey}/index.m3u8`;
    const Bucket = config.storage.s3.staticContent.bucketName;
    const Key = `${config.storage.s3.staticContent.keyPrefixes.streamThumbnails}/${streamKey}.jpg`;
    try {
        const output = await S3.headObject({Bucket, Key}).promise();
        return Date.now() > output.LastModified.getTime() + config.storage.thumbnails.ttl
            ? await generateStreamThumbnail({inputURL, Bucket, Key})
            : `https://${Bucket}.s3.amazonaws.com/${Key}`;
    } catch (err) {
        if (err.code === 'NotFound') {
            try {
                return await generateStreamThumbnail({inputURL, Bucket, Key});
            } catch (err) {
                throw err;
            }
        }
        throw err;
    }
}

function generateStreamThumbnail({inputURL, Bucket, Key}) {
    return new Promise((resolve, reject) => {
        const args = ['-i', inputURL, '-ss', '00:00:01', '-vframes', '1', '-vf', 'scale=-2:720', '-c:v', 'png', '-f', 'image2pipe', '-'];
        const ffmpeg = spawn(process.env.FFMPEG_PATH, args);
        ffmpeg.stderr.on('data', data => {
            LOGGER.debug('The following data was piped from an FFMPEG child process to stderr: {}', data)
        });
        ffmpeg.on('error', err => {
            LOGGER.error('An error occurred when generating stream thumbnail (stream URL: {}): {}', inputURL, err);
            reject(err);
        });
        ffmpeg.on('close', () => {
            LOGGER.debug('Finished generating stream thumbnail (stream URL: {})', inputURL);
        })
        ffmpeg.stdout.pipe(s3UploadStream.upload({Bucket, Key})
            .on('part', details => {
                LOGGER.debug('Uploaded {} bytes of stream thumbnail to S3 (bucket: {}, key: {})', details.uploadedSize, Bucket, Key);
            })
            .on('error', err => {
                LOGGER.error('An error occurred when uploading stream thumbnail to S3 (bucket: {}, key: {}): {}', Bucket, Key, err);
                reject(err);
            })
            .on('uploaded', details => {
                const location = details.Location;
                LOGGER.debug('Successfully uploaded thumbnail to {}', location);
                resolve(location);
            })
        );
    });
}

module.exports = {
    getThumbnail,
    generateStreamThumbnail
}