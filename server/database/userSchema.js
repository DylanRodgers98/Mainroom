const Schema = require('mongoose').Schema;
const bcrypt = require('bcrypt-nodejs');

const UserSchema = new Schema({
    username: String,
    email: String,
    password: {type: String, select: false},
    location: String,
    bio: String,
    links: [String],
    streamInfo: {
        streamKey: String,
        title: String,
        genre: String,
        category: String,
        tags: [String]
    },
    subscribers: [{type: Schema.Types.ObjectId, ref: 'User'}],
    subscriptions: [{type: Schema.Types.ObjectId, ref: 'User'}],
    scheduledStreams: [{type: Schema.Types.ObjectId, ref: 'ScheduledStream'}]
});

UserSchema.methods.generateHash = (password) => {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

UserSchema.methods.checkPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};

module.exports = UserSchema;