const {Schema} = require('mongoose');
const {
    storage: {s3: {defaultEventStageThumbnail}},
    validation: {streamSettings: {titleMaxLength, tagsMaxAmount}}
} = require('../../mainroom.config');
const nanoid = require('nanoid');
const {resolveObjectURL} = require('../aws/s3Utils');

const EventStageSchema = new Schema({
    event: {type: Schema.Types.ObjectId, ref: 'Event'},
    stageName: String,
    thumbnailPic: {
        bucket: {type: String, default: defaultEventStageThumbnail.bucket},
        key: {type: String, default: defaultEventStageThumbnail.key}
    },
    streamInfo: {
        streamKey: {type: String, select: false},
        title: {type: String, maxlength: titleMaxLength},
        genre: String,
        category: String,
        tags: {type: [String], validate: tags => tags.length <= tagsMaxAmount},
        viewCount: {type: Number, default: 0, min: 0},
        cumulativeViewCount: {type: Number, default: 0, min: 0},
        startTime: Date
    }
});

EventStageSchema.statics.generateStreamKey = nanoid;

EventStageSchema.methods.getThumbnailPicURL = function () {
    return resolveObjectURL({
        bucket: this.thumbnailPic.bucket,
        key: this.thumbnailPic.key
    });
};

module.exports = EventStageSchema;