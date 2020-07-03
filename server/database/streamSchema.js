const mongoose = require('mongoose');
const shortid = require('shortid');
const Schema = mongoose.Schema;

const StreamSchema = new Schema({
    username: String,
    streamKey: String,
    title: String,
    genre: String,
    category: String,
    tags: [String]
});

StreamSchema.methods.generateStreamKey = () => {
    return shortid.generate();
};

module.exports = StreamSchema;