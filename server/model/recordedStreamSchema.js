const {Schema} = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const config = require('../../mainroom.config');

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

RecordedStreamSchema.plugin(mongoosePaginate);

module.exports = RecordedStreamSchema;