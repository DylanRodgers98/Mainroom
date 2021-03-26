const {resolveObjectURL} = require('./s3Utils');
const { storage } = require('../../mainroom.config');
const {spawn} = require('child_process');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const LOGGER = require('../../logger')('./server/aws/s3ThumbnailGenerator.js');

const S3_CLIENT = new S3Client({});

async function getThumbnail(streamKey) {
    const inputURL = `http://${process.env.RTMP_SERVER_HOST}:${process.env.RTMP_SERVER_HTTP_PORT}/live/${streamKey}/index.m3u8`;
    const Bucket = storage.s3.staticContent.bucketName;
    const Key = `${storage.s3.staticContent.keyPrefixes.streamThumbnails}/${streamKey}.jpg`;
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

function generateStreamThumbnail({inputURL, Bucket, Key}) {
    return new Promise(async (resolve, reject) => {
        const args = ['-i', inputURL, '-ss', '00:00:01', '-vframes', '1', '-vf', 'scale=-2:720', '-c:v', 'png', '-f', 'image2pipe', '-'];
        const ffmpeg = spawn(process.env.FFMPEG_PATH, args);
        ffmpeg.stderr.on('data', data => {
            LOGGER.debug('stderr: {}', data)
            if (data.toString().includes(`${inputURL}: Server returned 4`)) {
                // If the file pointed to by inputURL causes a 4XX error (e.g. due to the stream just starting
                // and the video not being available to read), destroy stdout and kill child process
                ffmpeg.stdout.destroy();
                ffmpeg.kill();
                reject(new Error(`ffmpeg server returned a 4XX error when trying to read ${inputURL}`));
            }
        });
        ffmpeg.on('error', err => {
            LOGGER.error('An error occurred when generating stream thumbnail (stream URL: {}): {}', inputURL, `${err.toString()}\n${err.stack}`);
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
            LOGGER.debug('Uploaded {} bytes of thumbnail to S3 (bucket: {}, key: {})',
                progress.loaded, Bucket, Key);
        });

        try {
            const result = await upload.done();
            LOGGER.info('Successfully uploaded thumbnail to {}', result.Location);
            resolve({
                bucket: Bucket,
                key: Key
            });
        } catch (err) {
            LOGGER.error('An error occurred when uploading stream thumbnail to S3 (bucket: {}, key: {}): {}',
                Bucket, Key, `${err.toString()}\n${err.stack}`);
            reject(err);
        }
    });
}

module.exports = {
    getThumbnail,
    generateStreamThumbnail
}