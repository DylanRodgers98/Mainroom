const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');
const shortid = require('shortid');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: String,
    email: String,
    password: String,
    stream_key: String,
    stream_title: String,
    stream_genre: String,
    stream_tags: [String],
    subscribers: [String],
    subscriptions: [String]
});

UserSchema.methods.generateHash = (password) => {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

UserSchema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};

UserSchema.methods.generateStreamKey = () => {
    return shortid.generate();
};

module.exports = UserSchema;