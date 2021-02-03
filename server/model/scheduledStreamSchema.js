const {Schema} = require('mongoose');
const config = require('../../mainroom.config');

const ScheduledStreamSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    startTime: Date,
    endTime: {type: Date, index: {expires: config.storage.scheduledStream.ttl}},
    title: String,
    genre: String,
    category: String,
    tags: [String]
}, {
    timestamps: true
});

module.exports = ScheduledStreamSchema;