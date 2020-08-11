const Schema = require('mongoose').Schema;

const ScheduledStreamSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    startTime: Date,
    endTime: Date,
    title: String,
    genre: String,
    category: String,
    tags: [String]
});

module.exports = ScheduledStreamSchema;