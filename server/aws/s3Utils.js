const {
    S3Client,
    DeleteObjectCommand,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
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
            Bucket, Key, err.stack);
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

async function createMultipartUpload({Bucket, Key}) {
    try {
        const createMultipartUploadCommand = new CreateMultipartUploadCommand({Bucket, Key});
        const response = await S3_CLIENT.send(createMultipartUploadCommand);
        return response.UploadId;
    } catch (err) {
        LOGGER.error('An error occurred when creating multipart upload in S3 (bucket: {}, key: {}): {}',
            Bucket, Key, err.stack);
        await snsErrorPublisher.publish(err);
    }
}

async function getUploadPartSignedURLs({Bucket, Key, UploadId, NumberOfParts}) {
    try {
        const promises = [];
        for (let PartNumber = 1; PartNumber <= NumberOfParts; PartNumber++)
        {
            const uploadPartCommand = new UploadPartCommand({Bucket, Key, UploadId, PartNumber});
            promises.push(getSignedUrl(S3_CLIENT, uploadPartCommand, { expiresIn: 3600 }));
        }
        return await Promise.all(promises);
    } catch (err) {
        LOGGER.error('An error occurred when signing URLs for UploadPartCommands to S3 (bucket: {}, key: {}): {}',
            Bucket, Key, err.stack);
        await snsErrorPublisher.publish(err);
    }
}

async function completeMultipartUpload({Bucket, Key, UploadId, Parts}) {
    try {
        const completeMultipartUploadCommand = new CompleteMultipartUploadCommand({
            Bucket, Key, UploadId, MultipartUpload: { Parts }
        });
        await S3_CLIENT.send(completeMultipartUploadCommand);
    } catch (err) {
        LOGGER.error('An error occurred when completing multipart upload in S3 (Bucket: {}, Key: {}, UploadId: {}): {}',
            Bucket, Key, UploadId, err.stack);
        await snsErrorPublisher.publish(err);
    }
}

async function abortMultipartUpload({Bucket, Key, UploadId}) {
    try {
        const abortMultipartUploadCommand = new AbortMultipartUploadCommand({Bucket, Key, UploadId});
        await S3_CLIENT.send(abortMultipartUploadCommand);
    } catch (err) {
        LOGGER.error('An error occurred when aborting multipart upload in S3 (Bucket: {}, Key: {}, UploadId: {}): {}',
            Bucket, Key, UploadId, err.stack);
        await snsErrorPublisher.publish(err);
    }
}

module.exports = {
    deleteObject,
    resolveObjectURL,
    createMultipartUpload,
    getUploadPartSignedURLs,
    completeMultipartUpload,
    abortMultipartUpload
}
