const {Schema} = require('mongoose');
const bcrypt = require('bcryptjs');
const mongoosePaginate = require('mongoose-paginate-v2');
const config = require('../../mainroom.config');
const s3Utils = require('../aws/s3Utils');
const {RecordedStream, ScheduledStream} = require('./schemas');
const LOGGER = require('../../logger')('./server/model/userSchema.js');

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

UserSchema.pre('findOneAndDelete', async function() {
    const user = await this.model.findOne(this.getQuery());
    if (user) {
        LOGGER.debug('Executing pre-findOneAndDelete middleware for User (_id: {})', user._id);
        await Promise.all([
            deleteProfilePic(user),
            deleteScheduledStreams(user),
            deleteRecordedStreams(user)
        ]);
        LOGGER.debug('Deleting User (_id: {})', user._id);
    }
});

async function deleteProfilePic(user) {
    const profilePicURL = user.profilePicURL;
    if (profilePicURL !== config.defaultProfilePicURL) {
        LOGGER.debug('Deleting profile picture (URL: {}) for User (_id: {})', profilePicURL, user._id);
        await s3Utils.deleteByURL(user.profilePicURL);
    }
}

async function deleteScheduledStreams(user) {
    LOGGER.debug('Deleting ScheduledStreams for User (_id: {})', user._id);
    await ScheduledStream.deleteMany({user}).exec();
}

async function deleteRecordedStreams(user) {
    LOGGER.debug('Deleting RecordedStreams for User (_id: {})', user._id);

    // deletion must be done in for-each loop to trigger pre-findOneAndDelete
    // middleware in RecordedStreamSchema that deletes video and thumbnail in S3
    const streams = await RecordedStream.find({user}, '_id');
    for (const stream of streams) {
        await RecordedStream.findByIdAndDelete(stream._id);
    }
}

module.exports = UserSchema;