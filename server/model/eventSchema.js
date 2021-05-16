const {Schema} = require('mongoose');
const {
    storage: {s3: {defaultEventThumbnail}},
    validation: {event: {eventNameMaxLength, stagesMaxAmount, tagsMaxAmount}}
} = require('../../mainroom.config');
const {resolveObjectURL} = require('../aws/s3Utils');
const mongoosePaginate = require('mongoose-paginate-v2');

const EventSchema = new Schema({
    eventName: {type: String, maxlength: eventNameMaxLength},
    createdBy: {type: Schema.Types.ObjectId, ref: 'User'},
    startTime: Date,
    endTime: Date,
    bannerPic: {
        bucket: String,
        key: String
    },
    thumbnail: {
        bucket: {type: String, default: defaultEventThumbnail.bucket},
        key: {type: String, default: defaultEventThumbnail.key}
    },
    stages: {type: [{type: Schema.Types.ObjectId, ref: 'EventStage'}], validate: stages => stages.length <= stagesMaxAmount},
    tags: {type: [String], validate: tags => tags.length <= tagsMaxAmount}
});

EventSchema.methods.getBannerPicURL = function () {
    return !this.bannerPic || !this.bannerPic.bucket || !this.bannerPic.bucket
        ? undefined
        : resolveObjectURL({
            bucket: this.bannerPic.bucket,
            key: this.bannerPic.key
        });
};

EventSchema.methods.getThumbnailURL = function () {
    return resolveObjectURL({
        bucket: this.thumbnail.bucket,
        key: this.thumbnail.key
    });
};

EventSchema.plugin(mongoosePaginate);

module.exports = EventSchema;