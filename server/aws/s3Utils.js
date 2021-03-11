const { S3 } = require('@aws-sdk/client-s3');
const S3_CLIENT = new S3({});
const LOGGER = require('../../logger')('./server/aws/s3Utils.js');

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

module.exports = {
    deleteObject
}