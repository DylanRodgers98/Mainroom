const AWS = require('aws-sdk');
const S3 = new AWS.S3();
const LOGGER = require('../../logger')('./server/aws/s3Utils.js');

async function deleteByURL(s3UrlString) {
    const {Bucket, Key} = extractBucketAndKeyFromURL(s3UrlString);
    try {
        await S3.deleteObject({Bucket, Key}).promise();
    } catch (err) {
        LOGGER.error('An error occurred when deleting object in S3 (bucket: {}, key: {}): {}',
            Bucket, Key, err);
        throw err;
    }
}

function extractBucketAndKeyFromURL(s3UrlString) {
    const url = new URL(s3UrlString);
    const Bucket = url.hostname.replace('.s3.amazonaws.com', '');
    const Key = url.pathname.substring(1); // remove leading slash
    return {Bucket, Key};
}

module.exports = {
    deleteByURL
}