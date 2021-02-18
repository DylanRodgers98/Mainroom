const express = require('express');
const router = express.Router();
const config = require('../../mainroom.config');
const {User, ScheduledStream} = require('../model/schemas');
const loginChecker = require('connect-ensure-login');
const sanitise = require('mongo-sanitize');
const escape = require('escape-html');
const shortid = require('shortid');
const multer = require('multer');
const multerS3 = require('multer-s3');
const S3V2ToV3Bridge = require('../aws/s3-v2-to-v3-bridge');
const mime = require('mime-types');
const {validatePassword, getInvalidPasswordMessage} = require('../auth/passwordValidator');
const _ = require('lodash');
const axios = require('axios');
const LOGGER = require('../../logger')('./server/routes/users.js');

router.get('/', (req, res, next) => {
    const sanitisedQuery = sanitise(req.query.searchQuery);
    const escapedQuery = _.escapeRegExp(sanitisedQuery)
    const searchQuery = new RegExp(`^${escapedQuery}$`, 'i');

    const query = {
        $or: [
            {username: searchQuery},
            {displayName: searchQuery}
        ]
    };

    const options = {
        page: req.query.page,
        limit: req.query.limit,
        select: 'username displayName profilePicURL',
    };

    User.paginate(query, options, (err, result) => {
        if (err) {
            LOGGER.error('An error occurred when finding users: {}', err);
            next(err);
        } else {
            res.json({
                users: result.docs,
                nextPage: result.nextPage
            });
        }
    });
});

router.get('/:username', (req, res, next) => {
    const username = sanitise(req.params.username.toLowerCase());
    User.findOne({username: username}, 'username displayName profilePicURL location bio chatColour links subscribers')
        .exec((err, user) => {
            if (err) {
                LOGGER.error('An error occurred when finding user {}: {}', username, err);
                next(err);
            } else if (!user) {
                res.status(404).send(`User (username: ${escape(username)}) not found`);
            } else {
                res.json({
                    username: user.username,
                    profilePicURL: user.profilePicURL || config.defaultProfilePicURL,
                    displayName: user.displayName,
                    location: user.location,
                    bio: user.bio,
                    chatColour: user.chatColour,
                    links: user.links,
                    numOfSubscribers: user.subscribers.length
                });
            }
        });
});

router.patch('/:username', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const updateQuery = {};

    if (req.body.displayName) {
        updateQuery.displayName = sanitise(req.body.displayName);
    }
    if (req.body.location) {
        updateQuery.location = sanitise(req.body.location);
    }
    if (req.body.bio) {
        updateQuery.bio = sanitise(req.body.bio);
    }
    if (req.body.chatColour) {
        updateQuery.chatColour = sanitise(req.body.chatColour);
    }
    if (req.body.links && Array.isArray(req.body.links)) {
        updateQuery.links = sanitise(req.body.links);
    }

    const username = sanitise(req.params.username.toLowerCase());
    User.findOneAndUpdate({username: username}, updateQuery, (err, user) => {
        if (err) {
            LOGGER.error('An error occurred when updating user {}: {}', username, err);
            next(err);
        } else if (!user) {
            res.status(404).send(`User (username: ${escape(username)}) not found`);
        } else {
            res.sendStatus(200);
        }
    })
});

const s3UploadProfilePic = multer({
    storage: multerS3({
        s3: new S3V2ToV3Bridge(),
        bucket: config.storage.s3.staticContent.bucketName,
        cacheControl: 'max-age=0, must-revalidate',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
            const path = config.storage.s3.staticContent.keyPrefixes.profilePics;
            const userId = sanitise(req.params.userId);
            const extension = mime.extension(file.mimetype);
            cb(null, `${path}/${userId}.${extension}`);
        }
    })
}).single('profilePic');

router.put('/:userId/profile-pic', (req, res, next) => {
    const userId = sanitise(req.params.userId);
    if (userId) {
        s3UploadProfilePic(req, res, err => {
            if (err) {
                LOGGER.error('An error occurred when uploading profile pic to S3 for user {}: {}', userId, err);
                next(err);
            } else {
                User.findByIdAndUpdate(userId, {profilePicURL: req.file.location}, (err, user) => {
                    if (err) {
                        LOGGER.error('An error occurred when updating user with _id {}: {}', userId, err);
                        next(err);
                    } else if (!user) {
                        res.status(404).send(`User (_id: ${escape(userId)}) not found`);
                    } else {
                        res.sendStatus(200);
                    }
                })
            }
        });
    }
});

router.get('/:userId/profile-pic', (req, res, next) => {
    const userId = sanitise(req.params.userId);
    User.findById(userId, 'profilePicURL', (err, user) => {
        if (err) {
            LOGGER.error('An error occurred when finding user with _id {}: {}', userId, err);
            next(err);
        } else if (!user) {
            res.status(404).send(`User (_id: ${escape(userId)}) not found`);
        } else {
            res.json({
                profilePicURL: user.profilePicURL || config.defaultProfilePicURL
            })
        }
    })
});

const getSubscribersOrSubscriptions = key => (req, res, next) => {
    const username = sanitise(req.params.username.toLowerCase());
    // count number of subscribers for calculating 'nextPage' pagination property on result JSON
    User.aggregate([
        {
            $match: {username}
        },
        {
            $project: {count: {$size: '$' + key}}
        }
    ], (err, result) => {
        if (err) {
            LOGGER.error('An error occurred when counting number of {} for user {}: {}', key, username, err);
            next(err);
        } else {
            // populate subscribers/subscriptions, paginated
            const limit = req.query.limit
            const page = req.query.page;
            const pages = Math.ceil(result.count / limit);
            const skip = (page - 1) * limit;
            User.findOne({username}, key)
                .populate({
                    path: `${key}.user`,
                    select: 'username profilePicURL',
                    skip,
                    limit
                })
                .exec((err, user) => {
                    if (err) {
                        LOGGER.error('An error occurred when getting {} for user {}: {}', key, username, err);
                        next(err);
                    } else if (!user) {
                        res.status(404).send(`User (username: ${escape(username)}) not found`);
                    } else {
                        res.json({
                            [key]: (user[key] || []).map(sub => {
                                return {
                                    username: sub.user.username,
                                    profilePicURL: sub.user.profilePicURL || config.defaultProfilePicURL
                                };
                            }),
                            nextPage: page < pages ? page + 1 : null
                        });
                    }
                });
        }
    });
}

router.get('/:username/subscribers', getSubscribersOrSubscriptions('subscribers'));

router.get('/:username/subscriptions', getSubscribersOrSubscriptions('subscriptions'));

router.get('/:username/subscribed-to/:otherUsername', (req, res, next) => {
    const otherUsername = sanitise(req.params.otherUsername.toLowerCase());
    User.findOne({username: otherUsername}, 'subscribers', (err, otherUser) => {
        if (err) {
            LOGGER.error('An error occurred when finding user {}: {}', otherUsername, err);
            next(err);
        } else if (!otherUser) {
            res.status(404).send(`User (username: ${escape(otherUsername)}) not found`);
        } else {
            const username = sanitise(req.params.username.toLowerCase());
            User.findOne({username}, '_id', (err, user) => {
                if (err) {
                    LOGGER.error('An error occurred when finding user {}: {}', username, err);
                    next(err);
                } else if (!user) {
                    res.status(404).send(`User (username: ${escape(username)}) not found`);
                } else {
                    const isSubscribed = otherUser.subscribers.some(sub => _.isEqual(sub.user, user._id));
                    res.send(isSubscribed);
                }
            });
        }
    });
});

router.post('/:username/subscribe/:userToSubscribeTo', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const username = sanitise(req.params.username.toLowerCase());
    User.findOne({username: username}, (err, user) => {
        if (err) {
            LOGGER.error('An error occurred when finding user {}: {}', username, err);
            next(err);
        } else if (!user) {
            res.status(404).send(`User (username: ${escape(username)}) not found`);
        } else {
            const usernameToSubscribeTo = sanitise(req.params.userToSubscribeTo.toLowerCase())
            User.findOne({username: usernameToSubscribeTo}, 'subscribers',(err, userToSubscribeTo) => {
                if (err) {
                    LOGGER.error('An error occurred when finding user {}: {}', usernameToSubscribeTo, err);
                    next(err);
                } else if (!userToSubscribeTo) {
                    res.status(404).send(`User (username: ${escape(usernameToSubscribeTo)}) not found`);
                } else {
                    const isAlreadySubscribed = userToSubscribeTo.subscribers.some(sub => _.isEqual(sub.user, user._id));
                    if (!isAlreadySubscribed) {
                        userToSubscribeTo.updateOne({$push: {subscribers: {user: user._id}}}, err => {
                            if (err) {
                                LOGGER.error(`An error occurred when adding user {} to user {}'s subscribers: {}`,
                                    username, usernameToSubscribeTo, err);
                                next(err);
                            } else {
                                user.updateOne({$push: {subscriptions: {user: userToSubscribeTo._id}}}, err => {
                                    if (err) {
                                        LOGGER.error(`An error occurred when adding user {} to user {}'s subscriptions: {}`,
                                            usernameToSubscribeTo, username, err);
                                        next(err);
                                    } else {
                                        res.sendStatus(200);
                                    }
                                });
                            }
                        });
                    } else {
                        res.sendStatus(200);
                    }
                }
            });
        }
    });
});

router.post('/:username/unsubscribe/:userToUnsubscribeFrom', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const username = sanitise(req.params.username.toLowerCase());
    User.findOne({username}, (err, user) => {
        if (err) {
            LOGGER.error('An error occurred when finding user {}: {}', username, err);
            next(err);
        } else if (!user) {
            res.status(404).send(`User (username: ${escape(username)}) not found`);
        } else {
            const usernameToUnsubscribeFrom = sanitise(req.params.userToUnsubscribeFrom.toLowerCase())
            User.findOne({username: usernameToUnsubscribeFrom}, 'subscribers', (err, userToUnsubscribeFrom) => {
                if (err) {
                    LOGGER.error('An error occurred when finding user {}: {}', usernameToUnsubscribeFrom, err);
                    next(err);
                } else if (!userToUnsubscribeFrom) {
                    res.status(404).send(`User (username: ${escape(usernameToUnsubscribeFrom)}) not found`);
                } else {
                    const isSubscribed = userToUnsubscribeFrom.subscribers.some(sub => _.isEqual(sub.user, user._id));
                    if (isSubscribed) {
                        userToUnsubscribeFrom.updateOne({$pull: {subscribers: {user: user._id}}}, err => {
                            if (err) {
                                LOGGER.error(`An error occurred when removing user {} to user {}'s subscribers: {}`, username, userToUnsubscribeFrom, err);
                                next(err);
                            } else {
                                user.updateOne({$pull: {subscriptions: {user: userToUnsubscribeFrom._id}}}, err => {
                                    if (err) {
                                        LOGGER.error(`An error occurred when removing user {} to user {}'s subscriptions: {}`, userToUnsubscribeFrom, username, err);
                                        next(err);
                                    } else {
                                        res.sendStatus(200);
                                    }
                                });
                            }
                        });
                    } else {
                        res.sendStatus(200);
                    }
                }
            });
        }
    });
});

router.get('/:username/stream-info', (req, res, next) => {
    const username = sanitise(req.params.username.toLowerCase());
    User.findOne({username: username},
        'displayName profilePicURL streamInfo.streamKey streamInfo.title streamInfo.genre streamInfo.category streamInfo.tags streamInfo.viewCount',
        async (err, user) => {
            if (err) {
                LOGGER.error(`An error occurred when finding user {}'s stream info: {}`, username, err);
                next(err);
            } else if (!user) {
                res.status(404).send(`User (username: ${escape(username)}) not found`);
            } else {
                const streamKey = user.streamInfo.streamKey;
                const rtmpServerRes = await axios.get(`http://${process.env.RTMP_SERVER_HOST}:${process.env.RTMP_SERVER_HTTP_PORT}/api/streams/live/${streamKey}`);
                res.json({
                    isLive: rtmpServerRes.data.isLive,
                    displayName: user.displayName,
                    profilePicURL: user.profilePicURL || config.defaultProfilePicURL,
                    streamKey,
                    title: user.streamInfo.title,
                    genre: user.streamInfo.genre,
                    category: user.streamInfo.category,
                    tags: user.streamInfo.tags,
                    viewCount: user.streamInfo.viewCount,
                    rtmpServerURL: `rtmp://${process.env.RTMP_SERVER_HOST}:${process.env.RTMP_SERVER_RTMP_PORT}/${process.env.RTMP_SERVER_APP_NAME}`,
                    liveStreamURL: `http://${process.env.RTMP_SERVER_HOST}:${process.env.RTMP_SERVER_HTTP_PORT}/${process.env.RTMP_SERVER_APP_NAME}/${streamKey}/index.m3u8`,
                    socketIOURL: `http://${process.env.SERVER_HOST}:${process.env.SERVER_HTTP_PORT}?liveStreamUsername=${username}`,
                });
            }
        });
});

router.patch('/:username/stream-info', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const username = sanitise(req.params.username.toLowerCase());
    User.findOneAndUpdate({
        username: username
    }, {
        'streamInfo.title': sanitise(req.body.title),
        'streamInfo.genre': sanitise(req.body.genre),
        'streamInfo.category': sanitise(req.body.category),
        'streamInfo.tags': sanitise(req.body.tags)
    }, {
        new: true,
    }, (err, user) => {
        if (err) {
            LOGGER.error(`An error occurred when updating user {}'s stream info: {}`, username, err);
            next(err);
        } else if (!user) {
            res.status(404).send(`User (username: ${escape(username)}) not found`);
        } else {
            res.json({
                title: user.streamInfo.title,
                genre: user.streamInfo.genre,
                category: user.streamInfo.category,
                tags: user.streamInfo.tags
            });
        }
    });
});

router.post('/:username/stream-key', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const username = sanitise(req.params.username.toLowerCase());
    User.findOneAndUpdate({
        username: username
    }, {
        'streamInfo.streamKey': shortid.generate()
    }, {
        new: true
    }, (err, user) => {
        if (err) {
            LOGGER.error(`An error occurred when updating user {}'s stream key: {}`, username, err);
            next(err);
        } else if (!user) {
            res.status(404).send(`User (username: ${escape(username)}) not found`);
        } else {
            res.json({
                streamKey: user.streamInfo.streamKey
            });
        }
    });
});

router.get('/:username/schedule', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const username = sanitise(req.params.username.toLowerCase());
    User.findOne({username: username}, 'subscriptions nonSubscribedScheduledStreams', (err, user) => {
        if (err) {
            LOGGER.error(`An error occurred when getting finding user {}: {}`, username, err);
            next(err);
        } else if (!user) {
            res.status(404).send(`User (username: ${escape(username)}) not found`);
        } else {
            const subscriptionsIds = user.subscriptions.map(sub => sub.user._id);
            ScheduledStream.find({
                $or: [
                    {user: {$in: [user._id, ...subscriptionsIds]}},
                    {_id: {$in: user.nonSubscribedScheduledStreams}}
                ],
                startTime: {$lte: req.query.scheduleEndTime},
                endTime: {$gte: req.query.scheduleStartTime}
            })
            .select('user title startTime endTime genre category')
            .populate({
                path: 'user',
                select: 'username displayName profilePicURL'
            })
            .exec((err, scheduledStreams) => {
                if (err) {
                    LOGGER.error(`An error occurred when getting user {}'s schedule: {}`, username, err);
                    next(err);
                } else {
                    const scheduleGroups = [{
                        id: 0,
                        title: 'My Streams'
                    }];
                    const scheduleItems = [];

                    if (scheduledStreams && scheduledStreams.length) {
                        const usernameToScheduleGroupIds = new Map();
                        usernameToScheduleGroupIds.set(username, 0);

                        scheduledStreams.forEach(scheduledStream => {
                            const scheduledStreamUsername = scheduledStream.user.username;

                            let scheduleGroupId;
                            if (usernameToScheduleGroupIds.has(scheduledStreamUsername)) {
                                // if schedule group already exists for user, get its ID
                                scheduleGroupId = usernameToScheduleGroupIds.get(scheduledStreamUsername);
                            } else {
                                // if schedule group does not exist for user, create one
                                scheduleGroupId = scheduleGroups.length;
                                usernameToScheduleGroupIds.set(scheduledStreamUsername, scheduleGroupId);
                                scheduleGroups.push({
                                    id: scheduleGroupId,
                                    title: scheduledStreamUsername
                                });
                            }

                            scheduleItems.push({
                                _id: scheduledStream._id,
                                id: scheduleItems.length,
                                group: scheduleGroupId,
                                title: scheduledStream.title || scheduledStreamUsername,
                                start_time: scheduledStream.startTime,
                                end_time: scheduledStream.endTime,
                                genre: scheduledStream.genre,
                                category: scheduledStream.category,
                                user: scheduledStream.user,
                                isNonSubscribed: user.nonSubscribedScheduledStreams.includes(scheduledStream._id)
                            });
                        });
                    }

                    res.json({
                        scheduleGroups,
                        scheduleItems
                    });
                }
            });
        }
    });
});

router.get('/:username/schedule/non-subscribed', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const username = sanitise(req.params.username.toLowerCase());
    const scheduledStreamUsername = sanitise(req.query.scheduledStreamUsername.toLowerCase());
    User.findOne({username})
        .select('nonSubscribedScheduledStreams')
        .populate({
            path: 'nonSubscribedScheduledStreams',
            select: 'user',
            populate: {
                path: 'user',
                select: 'username',
                match: {
                    username: scheduledStreamUsername
                }
            }
        })
        .exec((err, user) => {
            if (err) {
                LOGGER.error(`An error occurred when retrieving non-subscribed scheduled streams for user {}: {}`, username, err);
                next(err);
            } else if (!user) {
                res.status(404).send(`User (username: ${escape(username)}) not found`);
            } else {
                res.json({
                    nonSubscribedScheduledStreams: user.nonSubscribedScheduledStreams.map(s => s._id)
                })
            }
        });
});

router.patch('/:username/schedule/add-non-subscribed/:scheduledStreamId', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const username = sanitise(req.params.username.toLowerCase());
    const scheduledStreamId = sanitise(req.params.scheduledStreamId);
    User.findOneAndUpdate({
        username
    }, {
        $push: {nonSubscribedScheduledStreams: scheduledStreamId}
    }, (err, user) => {
        if (err) {
            LOGGER.error(`An error occurred when adding non-subscribed scheduled stream (ID: {}) to user {}'s schedule: {}`, scheduledStreamId, username, err);
            next(err);
        } else if (!user) {
            res.status(404).send(`User (username: ${escape(username)}) not found`);
        } else {
            res.sendStatus(200);
        }
    });
});

router.patch('/:username/schedule/remove-non-subscribed/:scheduledStreamId', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const username = sanitise(req.params.username.toLowerCase());
    const scheduledStreamId = sanitise(req.params.scheduledStreamId);
    User.findOneAndUpdate({
        username
    }, {
        $pull: {nonSubscribedScheduledStreams: scheduledStreamId}
    }, (err, user) => {
        if (err) {
            LOGGER.error(`An error occurred when removing non-subscribed scheduled stream (ID: {}) to user {}'s schedule: {}`, scheduledStreamId, username, err);
            next(err);
        } else if (!user) {
            res.status(404).send(`User (username: ${escape(username)}) not found`);
        } else {
            res.sendStatus(200);
        }
    });
});

router.get('/:userId/settings', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const userId = sanitise(req.params.userId);
    User.findById(userId, 'username email emailSettings').exec((err, user) => {
        if (err) {
            LOGGER.error(`An error occurred when finding user with _id {}: {}`, userId, err);
            next(err);
        } else if (!user) {
            res.status(404).send(`User (username: ${escape(userId)}) not found`);
        } else {
            res.json({
                username: user.username,
                email: user.email,
                emailSettings: user.emailSettings
            });
        }
    });
});

router.patch('/:userId/settings', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const findQuery = {$or: []};
    const updateQuery = {};

    let isUpdatingUsernameOrEmail = false;

    const username = sanitise(req.body.username.toLowerCase());
    const email = sanitise(req.body.email);

    if (req.body.updateUsername) {
        findQuery.$or.push({username: username});
        updateQuery.username = username;
        isUpdatingUsernameOrEmail = true;
    }
    if (req.body.updateEmail) {
        findQuery.$or.push({email: email});
        updateQuery.email = email;
        isUpdatingUsernameOrEmail = true
    }
    if (req.body.emailSettings) {
        Object.entries(req.body.emailSettings).forEach(entry => {
            updateQuery[`emailSettings.${entry[0]}`] = entry[1];
        });
    }

    if (isUpdatingUsernameOrEmail) {
        User.find(findQuery, 'username email', (err, users) => {
            if (err) {
                LOGGER.error(`An error occurred when finding users with query {}: {}`, JSON.stringify(findQuery), err);
                next(err);
            } else if (users) {
                const invalidReasons = {};
                for (const user of users) {
                    if (user.email === email) {
                        invalidReasons.emailInvalidReason = 'Email is already taken';
                    }
                    if (user.username === username) {
                        invalidReasons.usernameInvalidReason = 'Username is already taken';
                    }
                }
                if (invalidReasons.emailInvalidReason || invalidReasons.usernameInvalidReason) {
                    res.json(invalidReasons);
                } else {
                    updateUserSettings(updateQuery, req, res, next);
                }
            }
        });
    } else {
        updateUserSettings(updateQuery, req, res, next);
    }
});

function updateUserSettings(updateQuery, req, res, next) {
    const userId = sanitise(req.params.userId);
    User.findByIdAndUpdate(userId, updateQuery, (err, user) => {
        if (err) {
            LOGGER.error(`An error occurred when updating user settings for user with _id {}: {}`, userId, err);
            next(err);
        } else if (!user) {
            res.status(404).send(`User (_id: ${escape(userId)}) not found`);
        } else {
            res.sendStatus(200);
        }
    });
}

router.post('/:userId/password', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const userId = sanitise(req.params.userId);
    User.findById(userId).select('+password').exec((err, user) => {
        if (err) {
            LOGGER.error(`An error occurred when finding user with _id {}: {}`, userId, err);
            next(err);
        } else if (!user) {
            res.status(404).send(`User (_id: ${escape(userId)}) not found`);
        } else {
            if (!user.checkPassword(req.body.currentPassword)) {
                res.json({
                    currentPasswordInvalidReason: 'Password incorrect'
                });
            } else if (user.checkPassword(req.body.newPassword)) {
                res.json({
                    newPasswordInvalidReason: 'New password cannot be the same as current password'
                });
            } else if (!validatePassword(req.body.newPassword)) {
                res.json({
                    newPasswordInvalidReason: getInvalidPasswordMessage()
                });
            } else if (req.body.newPassword !== req.body.confirmNewPassword) {
                res.json({
                    confirmNewPasswordInvalidReason: 'Passwords do not match'
                });
            } else {
                user.password = user.generateHash(req.body.newPassword);
                user.save(err => {
                    if (err) {
                        LOGGER.error(`An error occurred when updating password for user with _id {}: {}`, userId, err);
                        next(err);
                    } else {
                        res.sendStatus(200);
                    }
                });
            }
        }
    });
});

router.delete('/:id', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const id = sanitise(req.params.id);
    User.findById(id, (err, user) => {
        if (err) {
            LOGGER.error(`An error occurred when finding user (_id: {}) in database: {}`, id, err);
            next(err);
        } else if (!user) {
            res.status(404).send(`User (username: ${escape(id)}) not found`);
        } else {
            req.logout()
            User.findByIdAndDelete(id, err => {
                if (err) {
                    LOGGER.error(`An error occurred when deleting user (_id: {}) from database: {}`, id, err);
                    next(err);
                } else {
                    res.sendStatus(200);
                }
            })
        }
    });
});



module.exports = router;