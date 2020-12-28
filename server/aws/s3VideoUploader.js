const {spawn} = require('child_process');
const fs = require('fs');
const AWS = require('aws-sdk');
const s3UploadStream = require('s3-upload-stream')(new AWS.S3());
const LOGGER = require('../../logger')('./server/aws/s3VideoUploader.js');

exports.uploadVideoToS3 = ({inputURL, Bucket, Key}) => {
    return new Promise((resolve, reject) => {
        const outputURL = inputURL.replace('.mp4', '-final.mp4');
        const args = ['-i', inputURL, '-c:a', 'copy', '-c:v', 'copy', '-movflags', 'faststart', outputURL];
        const ffmpeg = spawn(process.env.FFMPEG_PATH, args);
        ffmpeg.stderr.on('data', data => {
            LOGGER.debug('The following data was piped from an FFMPEG child process to stderr: {}', data)
        });
        ffmpeg.on('error', err => {
            LOGGER.error('An error occurred when adding moov atom to recorded stream {}: {}', inputURL, err);
            reject(err);
        });
        ffmpeg.on('close', code => {
            LOGGER.debug('FFMPEG child process finished adding moov atom to recorded stream {} with exit code {}', outputURL, code);
            if (code === 0) {
                LOGGER.debug('Uploading video file at {} to S3 (bucket: {}, key: {})', outputURL, Bucket, Key);
                fs.createReadStream(outputURL)
                    .on('error', err => {
                        LOGGER.error('An error occurred when opening read stream at {}: {}', outputURL, err);
                        reject(err);
                    })
                    .pipe(s3UploadStream.upload({Bucket, Key})
                        .on('part', details => {
                            const uploaded = details.uploadedSize;
                            const received = details.receivedSize;
                            LOGGER.debug('Uploaded {}/{} of recorded stream to S3 (bucket: {}, key: {})', uploaded, received, Bucket, Key);
                        })
                        .on('error', err => {
                            LOGGER.error('An error occurred when uploading recorded stream to S3 (bucket: {}, key: {}): {}', Bucket, Key, err);
                            reject(err);
                        })
                        .on('uploaded', details => {
                            const location = details.Location;
                            LOGGER.info('Successfully uploaded recorded stream to {}', location);
                            resolve(location);
                        })
                    );
            }
        });
    });
}
