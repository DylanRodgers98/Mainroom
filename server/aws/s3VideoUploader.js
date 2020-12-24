const ffmpeg = require('fluent-ffmpeg');
const AWS = require('aws-sdk');
const s3UploadStream = require('s3-upload-stream')(new AWS.S3());
const LOGGER = require('../../logger')('./server/aws/s3VideoUploader.js');

exports.uploadVideoToS3 = ({inputURL, Bucket, Key}) => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputURL)
            .audioCodec('copy')
            .videoCodec('copy')
            .withOutputOption('-movflags +faststart')
            .on('error', err => {
                LOGGER.error('An error occurred when moving recorded stream from {} to S3 (bucket: {}, key: {}): {}', inputURL, Bucket, Key, err);
                reject(err);
            })
            .on('end', () => {
                LOGGER.debug('Successfully moved recorded stream to S3 (bucket: {}, key: {})', Bucket, Key);
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
    });
}
