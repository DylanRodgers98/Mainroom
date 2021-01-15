const {Schema} = require('mongoose');
const bcrypt = require('bcryptjs');
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
        tags: [String],
        viewCount: Number,
        cumulativeViewCount: Number
    },
    subscribers: [{type: Schema.Types.ObjectId, ref: 'User'}],
    subscriptions: [{type: Schema.Types.ObjectId, ref: 'User'}],
    nonSubscribedScheduledStreams: [{type: Schema.Types.ObjectId, ref: 'ScheduledStream'}],
    emailSettings: {
        newSubscriber: Boolean,
        subscriptionWentLive: Boolean,
        subscriptionCreatedScheduledStream: Boolean,
        subscriptionScheduledStreamStartingIn: Number
    }
});

UserSchema.methods.generateHash = password => {
    return bcrypt.hashSync(password);
};

UserSchema.methods.checkPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};

UserSchema.plugin(mongoosePaginate);

module.exports = UserSchema;