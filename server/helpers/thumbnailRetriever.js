const config = require('../../mainroom.config');
const ffmpeg = require('fluent-ffmpeg');
const concatStream = require('concat-stream');
const AWS = require('aws-sdk');
const LOGGER = require('../../logger')('./server/helpers/thumbnailRetriever.js');

const S3 = new AWS.S3();

module.exports.getThumbnail = (streamKey, cb) => {
    const Bucket = config.storage.s3.staticContent.bucketName;
    const Key = `${config.storage.s3.staticContent.keyPrefixes.streamThumbnails}/${streamKey}.png`;
    S3.headObject({Bucket, Key}, (err, output) => {
        if (err) {
            if (err.code === 'NotFound') {
                generateStreamThumbnail(streamKey, cb);
            } else {
                cb(err, null);
            }
        } else if (output.LastModified.getTime() + config.storage.thumbnails.ttl > Date.now()) {
            generateStreamThumbnail(streamKey, cb);
        } else {
            cb(null, `https://${Bucket}.s3.amazonaws.com/${Key}`);
        }
    })
}

function generateStreamThumbnail(streamKey, cb) {
    ffmpeg(`http://${config.rtmpServer.host}:${config.rtmpServer.http.port}/live/${streamKey}/index.m3u8`)
        .seek('00:00:01')
        .frames(1)
        .videoFilter({ filter: 'scale', options: [-2, 300] })
        .format('singlejpeg')
        .on('error', err => {
            LOGGER.error('An error occurred when generating stream thumbnail (stream key: {}): {}', streamKey, err);
            cb(err, null);
        })
        .on('end', () => {
            LOGGER.debug('Finished generating stream thumbnail (stream key: {})', streamKey);
        })
        .pipe(concatStream({encoding: 'buffer'}, Body => {
            const Bucket = config.storage.s3.staticContent.bucketName;
            const Key = `${config.storage.s3.staticContent.keyPrefixes.streamThumbnails}/${streamKey}.png`;
            S3.upload({Bucket, Key, Body}, (err, output) => {
                if (err) {
                    LOGGER.error('An error occurred when uploading stream thumbnail to S3 (bucket: {}, key: {}): {}', Bucket, Key, err);
                    cb(err, null);
                } else {
                    LOGGER.debug('Successfully uploaded thumbnail to S3 (bucket: {}, key: {})', Bucket, Key);
                    cb(null, output.Location);
                }
            });
        }));
}