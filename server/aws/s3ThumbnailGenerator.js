const {resolveObjectURL} = require('./s3Utils');
const { storage } = require('../../mainroom.config');
const {spawn} = require('child_process');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const axios = require('axios');
const LOGGER = require('../../logger')('./server/aws/s3ThumbnailGenerator.js');

const S3_CLIENT = new S3Client({});

async function getThumbnail(streamKey) {
    const inputURL = `http://localhost:${process.env.RTMP_SERVER_HTTP_PORT}/live/${streamKey}/index.m3u8`;
    const Bucket = storage.s3.livestreamThumbnails.bucketName;
    const Key = `${streamKey}.jpg`;
    try {
        const headObjectCommand = new HeadObjectCommand({Bucket, Key});
        const output = await S3_CLIENT.send(headObjectCommand);
        return Date.now() > output.LastModified.getTime() + storage.thumbnails.ttl
            ? resolveObjectURL(await generateStreamThumbnail({inputURL, Bucket, Key}))
            : resolveObjectURL({
                bucket: Bucket,
                key: Key
            });
    } catch (err) {
        if (err.name === 'NotFound') {
            return resolveObjectURL(await generateStreamThumbnail({inputURL, Bucket, Key}));
        }
        throw err;
    }
}

async function generateStreamThumbnail({inputURL, Bucket, Key}) {
    await checkFileExists(inputURL);
    return await doGenerateStreamThumbnail({Bucket, Key, inputURL});
}

async function checkFileExists(inputURL) {
    try {
        await axios.head(inputURL);
    } catch (err) {
        if (err.response.status === 404) {
            LOGGER.error('Stream file at {} does not exist', inputURL);
        } else {
            LOGGER.error('An unexpected error occurred during HEAD request to file at {}: {}',
                inputURL, err.stack || err.toString());
        }
        throw err;
    }
}

function doGenerateStreamThumbnail({Bucket, Key, inputURL}) {
    return new Promise((resolve, reject) => {
        const args = [
            '-i', inputURL,
            '-ss', '00:00:01',
            '-vframes', '1',
            '-vf', "scale=w=1280:h=720:force_original_aspect_ratio=1,pad=1280:720:(ow-iw)/2:(oh-ih)/2",
            '-c:v', 'png',
            '-f', 'image2pipe',
            '-'
        ];

        const ffmpeg = spawn(process.env.FFMPEG_PATH, args);
        ffmpeg.stderr.on('data', data => {
            LOGGER.debug('stderr: {}', data);
        });
        ffmpeg.on('error', err => {
            LOGGER.error('An error occurred when generating stream thumbnail (stream URL: {}): {}',
                inputURL, err.stack || err.toString());
            reject(err);
        });
        ffmpeg.on('close', () => {
            LOGGER.debug('Finished generating stream thumbnail (stream URL: {})', inputURL);
        });

        const upload = new Upload({
            client: S3_CLIENT,
            params: {Bucket, Key, Body: ffmpeg.stdout}
        });

        upload.on('httpUploadProgress', progress => {
            LOGGER.debug('Uploaded {} bytes of thumbnail to S3 (bucket: {}, key: {})',
                progress.loaded, Bucket, Key);
        });

        upload.done()
            .then(result => {
                LOGGER.info('Successfully uploaded thumbnail to {}', decodeURIComponent(result.Location));
                resolve({
                    bucket: Bucket,
                    key: Key
                });
            })
            .catch(err => {
                LOGGER.error('An error occurred when uploading stream thumbnail to S3 (bucket: {}, key: {}): {}',
                    Bucket, Key, err.stack || err.toString());
                reject(err);
            });
    });
}

module.exports = {
    getThumbnail,
    generateStreamThumbnail
}