const {Schema} = require('mongoose');
const {validation: {streamSettings: {titleMaxLength, tagsMaxAmount}}} = require('../../mainroom.config');

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

module.exports = ScheduledStreamSchema;