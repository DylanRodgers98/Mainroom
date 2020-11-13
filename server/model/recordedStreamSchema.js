const {Schema} = require('mongoose');

const RecordedStreamSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    title: String,
    genre: String,
    category: String,
    videoURL: String,
    thumbnailURL: String
});

module.exports = RecordedStreamSchema;