const config = require('../../mainroom.config');
const ffmpeg = require('fluent-ffmpeg');
const concatStream = require('concat-stream');
const AWS = require('aws-sdk');
const LOGGER = require('../../logger')('./server/helpers/s3ThumbnailRetriever.js');

const S3 = new AWS.S3();

module.exports.getThumbnail = async streamKey => {
    const Bucket = config.storage.s3.staticContent.bucketName;
    const Key = `${config.storage.s3.staticContent.keyPrefixes.streamThumbnails}/${streamKey}.jpg`;
    try {
        const output = await S3.headObject({Bucket, Key}).promise();
        return output.LastModified.getTime() + config.storage.thumbnails.ttl > Date.now()
            ? await generateStreamThumbnail(streamKey)
            : `https://${Bucket}.s3.amazonaws.com/${Key}`;
    } catch (err) {
        if (err.code === 'NotFound') {
            return await generateStreamThumbnail(streamKey);
        }
        throw err;
    }
}

function generateStreamThumbnail(streamKey) {
    return new Promise((resolve, reject) => {
        ffmpeg(`http://${config.rtmpServer.host}:${config.rtmpServer.http.port}/live/${streamKey}/index.m3u8`)
            .seek('00:00:01')
            .frames(1)
            .videoFilter({filter: 'scale', options: [-2, 300]})
            .format('singlejpeg')
            .on('error', err => {
                LOGGER.error('An error occurred when generating stream thumbnail (stream key: {}): {}', streamKey, err);
                reject(err);
            })
            .on('end', () => {
                LOGGER.debug('Finished generating stream thumbnail (stream key: {})', streamKey);
            })
            .pipe(concatStream({encoding: 'buffer'}, Body => {
                const Bucket = config.storage.s3.staticContent.bucketName;
                const Key = `${config.storage.s3.staticContent.keyPrefixes.streamThumbnails}/${streamKey}.jpg`;
                S3.upload({Bucket, Key, Body}, (err, output) => {
                    if (err) {
                        LOGGER.error('An error occurred when uploading stream thumbnail to S3 (bucket: {}, key: {}): {}', Bucket, Key, err);
                        reject(err);
                    } else {
                        const location = output.Location;
                        LOGGER.debug('Successfully uploaded thumbnail to {}', location);
                        resolve(location);
                    }
                });
            }));
    });
}