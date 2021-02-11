const { S3 } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

/**
 * This class is designed to be used as a bridge for APIs that require an S3
 * client from v2 of the AWS SDK.
 *
 * Mainroom now uses v3 of the AWS SDK, whose S3 client does not include an
 * upload method, which is required by at least one API (namely 'multer-s3).
 * This method has now been moved to a new library called @aws-sdk/lib-storage,
 * and so this class acts as a facade to make the upload function accessible,
 * whilst under the hood redirecting to the new library.
 *
 * Any methods that are required by APIs that use an instance of this class as
 * an S3 client, but are still part of S3, should be added to this class with
 * a call redirecting to the S3 client. This is because the S3 class exported
 * from aws-sdk/client-s3 cannot be extended due to it being a TypeScript
 * declare class, and so redirection is required instead (see the deleteObject
 * method for an example of how to do this).
 */
class S3V2ToV3Bridge {

    constructor(configuration) {
        this.s3Client = new S3(configuration || {});
    }

    upload(params) {
        return new UploadV2ToV3Bridge({client: this.s3Client, params});
    }

    deleteObject(args, cb) {
        this.s3Client.deleteObject(args, cb);
    }

}

class UploadV2ToV3Bridge {

    constructor(options) {
        this.upload = new Upload(options);
    }

    on(event, listener) {
        if (event !== 'httpUploadProgress') {
            throw new Error(`Event type is not 'httpUploadProcess', which is the only event type that can be listened to on Upload`);
        }
        this.upload.on('httpUploadProgress', listener);
    }

    async send(cb) {
        try {
            const result = await this.upload.done();
            cb(null, result);
        } catch (err) {
            cb(err, null);
        }
    }

}

module.exports = S3V2ToV3Bridge;