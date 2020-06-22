const mongoose = require('mongoose');
const shortid = require('shortid');
const Schema = mongoose.Schema;

const StreamSchema = new Schema({
    username: String,
    stream_key: String,
    stream_title: String,
    stream_genre: String,
    stream_tags: [String]
});

StreamSchema.methods.generateStreamKey = () => {
    return shortid.generate();
};

module.exports = StreamSchema;