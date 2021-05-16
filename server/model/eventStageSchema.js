const {Schema} = require('mongoose');
const {
    defaultEventStageName,
    storage: {s3: {defaultEventStageSplashThumbnail}},
    validation: {streamSettings: {titleMaxLength, tagsMaxAmount}, eventStage: {stageNameMaxLength}}
} = require('../../mainroom.config');
const nanoid = require('nanoid');
const {resolveObjectURL} = require('../aws/s3Utils');

const EventStageSchema = new Schema({
    event: {type: Schema.Types.ObjectId, ref: 'Event'},
    stageName: {type: String, default: defaultEventStageName, maxlength: stageNameMaxLength},
    splashThumbnail: {
        bucket: {type: String, default: defaultEventStageSplashThumbnail.bucket},
        key: {type: String, default: defaultEventStageSplashThumbnail.key}
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

EventStageSchema.methods.getSplashThumbnailURL = function () {
    return resolveObjectURL({
        bucket: this.splashThumbnail.bucket,
        key: this.splashThumbnail.key
    });
};

module.exports = EventStageSchema;