const {Schema} = require('mongoose');
const bcrypt = require('bcrypt-nodejs');
const mongoosePaginate = require('mongoose-paginate-v2');
const config = require('../../mainroom.config');

const UserSchema = new Schema({
    username: {type: String, lowercase: true},
    email: String,
    password: {type: String, select: false},
    profilePicURL: {type: String, default: config.defaultProfilePicURL},
    displayName: String,
    location: String,
    bio: String,
    links: [{title: String, url: String}],
    streamInfo: {
        streamKey: String,
        title: String,
        genre: String,
        category: String,
        tags: [String]
    },
    subscribers: [{type: Schema.Types.ObjectId, ref: 'User'}],
    subscriptions: [{type: Schema.Types.ObjectId, ref: 'User'}],
    scheduledStreams: [{type: Schema.Types.ObjectId, ref: 'ScheduledStream'}],
    emailSettings: {
        newSubscriber: Boolean,
        subscriptionWentLive: Boolean,
        subscriptionCreatedScheduledStream: Boolean,
        subscriptionScheduledStreamStartingIn: Number,
        marketing: Boolean
    }
});

UserSchema.methods.generateHash = password => {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

UserSchema.methods.checkPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};

UserSchema.plugin(mongoosePaginate);

module.exports = UserSchema;