const {Schema} = require('mongoose');
const bcrypt = require('bcryptjs');
const mongoosePaginate = require('mongoose-paginate-v2');
const {defaultProfilePicURL, chatColours} = require('../../mainroom.config');
const s3Utils = require('../aws/s3Utils');
const {RecordedStream, ScheduledStream} = require('./schemas');
const shortid = require('shortid');
const LOGGER = require('../../logger')('./server/model/userSchema.js');

const UserSchema = new Schema({
    username: {type: String, lowercase: true},
    email: String,
    password: {type: String, select: false},
    profilePicURL: {type: String, default: defaultProfilePicURL},
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
        viewCount: {type: Number, default: 0, min: 0},
        cumulativeViewCount: {type: Number, default: 0, min: 0}
    },
    subscribers: [{
        user: {type: Schema.Types.ObjectId, ref: 'User'},
        subscribedAt: {type: Date, default: () => new Date()}
    }],
    subscriptions: [{
        user: {type: Schema.Types.ObjectId, ref: 'User'},
        subscribedAt: {type: Date, default: () => new Date()}
    }],
    nonSubscribedScheduledStreams: [{type: Schema.Types.ObjectId, ref: 'ScheduledStream'}],
    emailSettings: {
        newSubscribers: Boolean,
        subscriptionWentLive: Boolean,
        subscriptionsCreatedScheduledStreams: Boolean,
        subscriptionScheduledStreamStartingIn: Number
    },
    chatColour: {type: String, default: getRandomColour}
});

UserSchema.statics.generateHash = password => {
    return bcrypt.hashSync(password);
};

UserSchema.methods.checkPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};

UserSchema.statics.generateStreamKey = () => {
    return shortid.generate();
};

UserSchema.statics.getRandomChatColour = () => {
    return getRandomColour();
};

function getRandomColour() {
    const keys = Object.keys(chatColours);
    return chatColours[keys[keys.length * Math.random() << 0]];
}

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
    if (profilePicURL !== defaultProfilePicURL) {
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

    const streams = await RecordedStream.find({user}).select( '_id').exec();
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

    const subscribersIds = user.subscribers.map(sub => sub.user);
    const subscriptionsIds = user.subscriptions.map(sub => sub.user);

    const pullFromSubscribers = model.updateMany({_id: {$in: subscribersIds}}, {$pull: {subscribers: {user: user._id}}});
    const pullFromSubscriptions = model.updateMany({_id: {$in: subscriptionsIds}}, {$pull: {subscriptions: {user: user._id}}});

    const promiseResults = await Promise.all([
        pullFromSubscribers,
        pullFromSubscriptions
    ]);

    LOGGER.debug('Successfully removed User (_id: {}) from {} subscribers lists and {} subscriptions lists',
        user._id, promiseResults[0].nModified, promiseResults[1].nModified);
}

module.exports = UserSchema;