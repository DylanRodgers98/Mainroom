const {Schema} = require('mongoose');
const {validation: {streamSettings: {titleMaxLength, tagsMaxAmount}}} = require('../../mainroom.config');
const {resolveObjectURL} = require('../aws/s3Utils');

const ScheduledStreamSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    eventStage: {type: Schema.Types.ObjectId, ref: 'EventStage'},
    startTime: Date,
    endTime: Date,
    title: {type: String, maxlength: titleMaxLength},
    genre: String,
    category: String,
    tags: {type: [String], validate: tags => tags.length <= tagsMaxAmount},
    prerecordedVideoFile: {
        bucket: String,
        key: String
    }
}, {
    timestamps: true
});

ScheduledStreamSchema.methods.getPrerecordedVideoFileURL = function () {
    return !this.prerecordedVideoFile || !this.prerecordedVideoFile.bucket || !this.prerecordedVideoFile.key
        ? undefined
        : resolveObjectURL({
            bucket: this.prerecordedVideoFile.bucket,
            key: this.prerecordedVideoFile.key
        });
};

module.exports = ScheduledStreamSchema;