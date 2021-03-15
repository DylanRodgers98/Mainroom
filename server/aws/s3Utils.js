const { S3 } = require('@aws-sdk/client-s3');
const {storage: {cloudfront}} = require('../../mainroom.config');
const LOGGER = require('../../logger')('./server/aws/s3Utils.js');

const S3_CLIENT = new S3({});

async function deleteObject({Bucket, Key}) {
    try {
        LOGGER.debug('Deleting object in S3 (bucket: {}, key: {})', Bucket, Key);
        await S3_CLIENT.deleteObject({Bucket, Key});
    } catch (err) {
        LOGGER.error('An error occurred when deleting object in S3 (bucket: {}, key: {}): {}',
            Bucket, Key, err);
        throw err;
    }
}

function resolveObjectURL({Bucket, Key}) {
    if (cloudfront[Bucket]) {
        return `https://${cloudfront[Bucket]}/${Key}`;
    }
    LOGGER.info(`Cloudfront distribution not configured for bucket '{}', returning S3 URL`, Bucket);
    return `https://${Bucket}.s3.amazonaws.com/${Key}`;
}

module.exports = {
    deleteObject,
    resolveObjectURL
}
