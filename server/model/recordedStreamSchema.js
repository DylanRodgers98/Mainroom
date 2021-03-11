const {Schema} = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const {storage} = require('../../mainroom.config');
const s3Utils = require('../aws/s3Utils');
const LOGGER = require('../../logger')('./server/model/recordedStreamSchema.js');

const RecordedStreamSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    timestamp: Date,
    title: String,
    genre: String,
    category: String,
    tags: [String],
    video: {
        bucket: {type: String, default: storage.s3.streams.bucketName},
        key: String
    },
    thumbnail: {
        bucket: {type: String, default: storage.s3.defaultStreamThumbnail.bucket},
        key: {type: String, default: storage.s3.defaultStreamThumbnail.key}
    },
    viewCount: {type: Number, default: 0},
    videoDuration: String
});

RecordedStreamSchema.methods.getVideoURL = function () {
    return `https://${storage.cloudfront[this.video.bucket]}/${this.video.key}`;
};

RecordedStreamSchema.methods.getThumbnailURL = function () {
    return `https://${storage.cloudfront[this.thumbnail.bucket]}/${this.thumbnail.key}`;
};

RecordedStreamSchema.pre('findOneAndDelete', async function() {
    const recordedStream = await this.model.findOne(this.getQuery());
    if (recordedStream) {
        await deleteVideoAndThumbnail(recordedStream);
        LOGGER.debug('Deleting RecordedStream (_id: {})', recordedStream._id);
    }
});

RecordedStreamSchema.post('findOneAndDelete', async function() {
    LOGGER.debug('Successfully deleted RecordedStream (_id: {})', this.getQuery()._id);
});

async function deleteVideoAndThumbnail(recordedStream) {
    const video = recordedStream.video;
    const thumbnail = recordedStream.thumbnail;

    LOGGER.debug('Deleting video (bucket: {}, key: {}) and thumbnail (bucket: {}, key: {}) in S3 for RecordedStream (_id: {})',
        video.bucket, video.key, thumbnail.bucket, thumbnail.key, recordedStream._id);

    const promises = []

    const deleteVideoPromise = s3Utils.deleteObject(video);
    promises.push(deleteVideoPromise);

    if (thumbnail.bucket !== storage.s3.defaultStreamThumbnail.bucket
        && thumbnail.key !== storage.s3.defaultStreamThumbnail.key) {
        const deleteThumbnailPromise = s3Utils.deleteObject(thumbnail)
        promises.push(deleteThumbnailPromise);
    }

    await Promise.all(promises);

    LOGGER.debug('Successfully deleted video and thumbnail in S3 for RecordedStream (_id: {})', recordedStream._id);
}

RecordedStreamSchema.plugin(mongoosePaginate);

module.exports = RecordedStreamSchema;