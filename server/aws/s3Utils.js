const AWS = require('aws-sdk');
const S3 = new AWS.S3();

function extractBucketAndKey(urlString) {
    const url = new URL(urlString);
    const Bucket = url.hostname.replace('.s3.amazonaws.com', '');
    const Key = url.pathname.substring(1); // remove leading slash
    return {Bucket, Key};
}

async function clearBucketAtPrefix({Bucket, Prefix}) {
    const objects = await S3.listObjectsV2({Bucket, Prefix}).promise();
    if (objects.Contents.length) {
        await S3.deleteObjects({
            Bucket,
            Delete: {
                Objects: objects.Contents.map(object => {
                    return {
                        Key: object.Key
                    };
                })
            }
        }).promise();

        if (objects.IsTruncated) {
            await clearBucketAtPrefix({Bucket, Prefix});
        }
    }
}

module.exports = {
    extractBucketAndKey,
    clearBucketAtPrefix
}