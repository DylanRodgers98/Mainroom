const Schema = require('mongoose').Schema;
const config = require('../../mainroom.config')

const ScheduledStreamSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    startTime: Date,
    endTime: {type: Date, index: {expires: config.database.scheduledStream.ttl}},
    title: String,
    genre: String,
    category: String,
    tags: [String]
});

module.exports = ScheduledStreamSchema;