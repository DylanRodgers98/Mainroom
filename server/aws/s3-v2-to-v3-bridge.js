const { S3 } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

class S3V2ToV3Bridge extends S3 {

    constructor(configuration) {
        super(configuration || {});
    }

    upload(params){
        return new UploadV2ToV3Bridge({client: this, params});
    }

}

class UploadV2ToV3Bridge extends Upload {

    constructor(options) {
        super(options);
    }

    async send(cb) {
        try {
            const result = await super.done();
            cb(null, result);
        } catch (err) {
            cb(err, null);
        }
    }

}

module.exports = S3V2ToV3Bridge;
