const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const {storage: {cloudfront}} = require('../../mainroom.config');
const snsErrorPublisher = require('./snsErrorPublisher');
const LOGGER = require('../../logger')('./server/aws/s3Utils.js');

const S3_CLIENT = new S3Client({});

async function deleteObject({Bucket, Key}) {
    try {
        LOGGER.debug('Deleting object in S3 (bucket: {}, key: {})', Bucket, Key);
        const deleteObjectCommand = new DeleteObjectCommand({Bucket, Key});
        await S3_CLIENT.send(deleteObjectCommand);
    } catch (err) {
        LOGGER.error('An error occurred when deleting object in S3 (bucket: {}, key: {}): {}',
            Bucket, Key, `${err.toString()}\n${err.stack}`);
        await snsErrorPublisher.publish(err);
    }
}

function resolveObjectURL({bucket, key}) {
    if (cloudfront[bucket]) {
        return `https://${cloudfront[bucket]}/${key}`;
    }
    LOGGER.info(`Cloudfront distribution not configured for bucket '{}', returning S3 URL`, bucket);
    return `https://${bucket}.s3.amazonaws.com/${key}`;
}

module.exports = {
    deleteObject,
    resolveObjectURL
}
