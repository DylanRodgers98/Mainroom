const {Schema} = require('mongoose');
const {validation: {streamSettings: {tagsMaxAmount}}} = require('../../mainroom.config');
const {resolveObjectURL} = require('../aws/s3Utils');

const EventSchema = new Schema({
    name: String,
    createdBy: {type: Schema.Types.ObjectId, ref: 'User'},
    startTime: Date,
    endTime: Date,
    bannerPic: {
        bucket: String,
        key: String
    },
    stages: [{type: Schema.Types.ObjectId, ref: 'EventStage'}],
    tags: {type: [String], validate: tags => tags.length <= tagsMaxAmount}
});

EventSchema.methods.getBannerPicURL = function () {
    return resolveObjectURL({
        bucket: this.bannerPic.bucket,
        key: this.bannerPic.key
    });
};

module.exports = EventSchema;