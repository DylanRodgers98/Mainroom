const config = require('../../mainroom.config');
const {spawn} = require('child_process');
const { S3 } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const LOGGER = require('../../logger')('./server/aws/s3ThumbnailGenerator.js');

const S3_CLIENT = new S3({});

async function getThumbnail(streamKey) {
    const inputURL = `http://${process.env.RTMP_SERVER_HOST}:${process.env.RTMP_SERVER_HTTP_PORT}/live/${streamKey}/index.m3u8`;
    const Bucket = config.storage.s3.staticContent.bucketName;
    const Key = `${config.storage.s3.staticContent.keyPrefixes.streamThumbnails}/${streamKey}.jpg`;
    try {
        const output = await S3_CLIENT.headObject({Bucket, Key});
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
    return new Promise(async (resolve, reject) => {
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

        const upload = new Upload({
            client: S3_CLIENT,
            params: {Bucket, Key, Body: ffmpeg.stdout}
        });

        upload.on('httpUploadProgress', progress => {
            LOGGER.debug('Uploaded {} bytes of recorded stream to S3 (bucket: {}, key: {})',
                progress.loaded, Bucket, Key);
        });

        try {
            const result = await upload.done();
            LOGGER.info('Successfully uploaded thumbnail to {}', result.Location);
            resolve(result.Location);
        } catch (err) {
            LOGGER.error('An error occurred when uploading stream thumbnail to S3 (bucket: {}, key: {}): {}',
                Bucket, Key, err);
            reject(err);
        }
    });
}

module.exports = {
    getThumbnail,
    generateStreamThumbnail
}