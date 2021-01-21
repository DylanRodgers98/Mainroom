const {Schema} = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const config = require('../../mainroom.config');
const s3Utils = require('../aws/s3Utils');
const LOGGER = require('../../logger')('./server/model/recordedStreamSchema.js');

const RecordedStreamSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    timestamp: Date,
    title: String,
    genre: String,
    category: String,
    tags: [String],
    videoURL: String,
    thumbnailURL: {type: String, default: config.defaultThumbnailURL},
    viewCount: {type: Number, default: 0},
    videoDuration: String
});

RecordedStreamSchema.pre('findOneAndDelete', async function() {
    const recordedStream = await this.model.findOne(this.getQuery());
    if (recordedStream) {
        LOGGER.debug('Executing pre-findOneAndDelete middleware for RecordedStream (_id: {})', recordedStream._id);
        await deleteVideoAndThumbnail(recordedStream);
        LOGGER.debug('Deleting RecordedStream (_id: {})', recordedStream._id);
    }
});

async function deleteVideoAndThumbnail(recordedStream) {
    LOGGER.debug('Deleting video (URL: {}) and thumbnail (URL: {}) for recorded stream (_id: {})',
        recordedStream.videoURL, recordedStream.thumbnailURL, recordedStream._id);

    const promises = []

    const deleteVideoPromise = s3Utils.deleteByURL(recordedStream.videoURL);
    promises.push(deleteVideoPromise);

    const thumbnailURL = recordedStream.thumbnailURL;
    if (thumbnailURL !== config.defaultThumbnailURL) {
        const deleteThumbnailPromise = s3Utils.deleteByURL(thumbnailURL)
        promises.push(deleteThumbnailPromise);
    }

    await Promise.all(promises);
}

RecordedStreamSchema.plugin(mongoosePaginate);

module.exports = RecordedStreamSchema;