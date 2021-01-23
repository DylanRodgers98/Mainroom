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
    },
    chatColour: {type: String, default: getRandomColour}
});

function getRandomColour() {
    return '#000000'.replace(/0/g, () => (~~(Math.random() * 16)).toString(16));
}

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
        await Promise.all([
            deleteProfilePic(user),
            deleteScheduledStreams(user),
            deleteRecordedStreams(user),
            removeFromSubscriptions(user, this.model)
        ]);
        LOGGER.debug('Deleting User (_id: {})', user._id);
    }
});

UserSchema.post('findOneAndDelete', async function() {
    LOGGER.info('Successfully deleted User (_id: {})', this.getQuery()._id);
});

async function deleteProfilePic(user) {
    const profilePicURL = user.profilePicURL;
    if (profilePicURL !== config.defaultProfilePicURL) {
        LOGGER.debug('Deleting profile picture in S3 (URL: {}) for User (_id: {})', profilePicURL, user._id);
        await s3Utils.deleteByURL(user.profilePicURL);
        LOGGER.debug('Successfully deleted profile picture in S3 for User (_id: {})', profilePicURL, user._id);
    }
}

async function deleteScheduledStreams(user) {
    LOGGER.debug('Deleting ScheduledStreams for User (_id: {})', user._id);
    await ScheduledStream.deleteMany({user});
    LOGGER.debug('Successfully deleted ScheduledStreams for User (_id: {})', user._id);
}

async function deleteRecordedStreams(user) {
    // deletion must be done in for-each loop and using findByIdAndDelete
    // to trigger pre-findOneAndDelete middleware in RecordedStreamSchema
    // that deletes video and thumbnail in S3

    const streams = await RecordedStream.find({user}, '_id');
    if (streams.length) {
        LOGGER.debug('Deleting {} RecordedStreams for User (_id: {})', streams.length, user._id);
        let deleted = 0;
        for (const stream of streams) {
            try {
                await RecordedStream.findByIdAndDelete(stream._id);
                deleted++;
            } catch (err) {
                LOGGER.error('An error occurred when deleting RecordedStream (_id: {}) for User (_id: {}): {}',
                    stream._id, user._id, err);
            }
        }
        LOGGER.debug('Successfully deleted {} RecordedStreams for User (_id: {})', deleted, user._id);
    }
}

async function removeFromSubscriptions(user, model) {
    LOGGER.debug('Removing User (_id: {}) from subscribers/subscriptions lists', user._id);

    const pullFromSubscribers = model.updateMany({_id: {$in: user.subscriptions}}, {$pull: {subscribers: user._id}});
    const pullFromSubscriptions = model.updateMany({_id: {$in: user.subscribers}}, {$pull: {subscriptions: user._id}});

    const promiseResults = await Promise.all([
        pullFromSubscribers,
        pullFromSubscriptions
    ]);

    LOGGER.debug('Successfully removed User (_id: {}) from {} subscribers lists and {} subscriptions lists',
        user._id, promiseResults[0].nModified, promiseResults[1].nModified);
}

module.exports = UserSchema;