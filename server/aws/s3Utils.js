const { S3 } = require('@aws-sdk/client-s3');
const S3_CLIENT = new S3({});
const LOGGER = require('../../logger')('./server/aws/s3Utils.js');

async function deleteByURL(s3UrlString) {
    const {Bucket, Key} = extractBucketAndKeyFromURL(s3UrlString);
    try {
        LOGGER.debug('Deleting object in S3 (bucket: {}, key: {})', Bucket, Key);
        await S3_CLIENT.deleteObject({Bucket, Key});
    } catch (err) {
        LOGGER.error('An error occurred when deleting object in S3 (bucket: {}, key: {}): {}',
            Bucket, Key, err);
        throw err;
    }
}

function extractBucketAndKeyFromURL(s3UrlString) {
    const url = new URL(decodeURIComponent(s3UrlString));
    const s3UrlSuffix = new RegExp(`\\.s3(\\.${process.env.AWS_REGION})?\\.amazonaws\\.com`);
    const Bucket = url.hostname.replace(s3UrlSuffix, ''); // extract bucket from S3 URL
    const Key = url.pathname.substring(1); // remove leading slash
    return {Bucket, Key};
}

module.exports = {
    deleteByURL
}