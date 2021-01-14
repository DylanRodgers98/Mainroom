const express = require('express');
const router = express.Router();
const config = require('../../mainroom.config');
const {User, ScheduledStream} = require('../model/schemas');
const loginChecker = require('connect-ensure-login');
const sanitise = require('mongo-sanitize');
const escape = require('escape-html');
const shortid = require('shortid');
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const mime = require('mime-types');
const mainroomEventEmitter = require('../mainroomEventEmitter');
const passwordValidator = require('../auth/passwordValidator');
const LOGGER = require('../../logger')('./server/routes/users.js');

router.get('/:username', (req, res, next) => {
    const username = sanitise(req.params.username.toLowerCase());
    User.findOne({username: username}, 'username displayName profilePicURL location bio links subscribers')
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

const s3 = new AWS.S3();

const s3UploadProfilePic = multer({
    storage: multerS3({
        s3: s3,
        bucket: config.storage.s3.staticContent.bucketName,
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
            // populate subscribers, paginated
            const limit = req.query.limit
            const page = req.query.page;
            const pages = Math.ceil(result.count / limit);
            const skip = (page - 1) * limit;
            User.findOne({username}, key)
                .populate({
                    path: key,
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
                                    username: sub.username,
                                    profilePicURL: sub.profilePicURL || config.defaultProfilePicURL
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
            User.findOne({username: username}, '_id', (err, user) => {
                if (err) {
                    LOGGER.error('An error occurred when finding user {}: {}', username, err);
                    next(err);
                } else if (!user) {
                    res.status(404).send(`User (username: ${escape(username)}) not found`);
                } else {
                    res.send(otherUser.subscribers.includes(user._id));
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
            User.findOne({username: usernameToSubscribeTo}, (err, userToSubscribeTo) => {
                if (err) {
                    LOGGER.error('An error occurred when finding user {}: {}', usernameToSubscribeTo, err);
                    next(err);
                } else if (!userToSubscribeTo) {
                    res.status(404).send(`User (username: ${escape(usernameToSubscribeTo)}) not found`);
                } else {
                    userToSubscribeTo.updateOne({$addToSet: {subscribers: user._id}}, err => {
                        if (err) {
                            LOGGER.error(`An error occurred when adding user {} to user {}'s subscribers: {}`, username, usernameToSubscribeTo, err);
                            next(err);
                        } else {
                            user.updateOne({$addToSet: {subscriptions: userToSubscribeTo._id}}, err => {
                                if (err) {
                                    LOGGER.error(`An error occurred when adding user {} to user {}'s subscriptions: {}`, usernameToSubscribeTo, username, err);
                                    next(err);
                                } else {
                                    mainroomEventEmitter.emit('onNewSubscriber', userToSubscribeTo, user)
                                    res.sendStatus(200);
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

router.post('/:username/unsubscribe/:userToUnsubscribeFrom', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const username = sanitise(req.params.username.toLowerCase());
    User.findOne({username: username}, '_id', (err, user) => {
        if (err) {
            LOGGER.error('An error occurred when finding user {}: {}', username, err);
            next(err);
        } else if (!user) {
            res.status(404).send(`User (username: ${escape(username)}) not found`);
        } else {
            const usernameToUnsubscribeFrom = sanitise(req.params.userToUnsubscribeFrom.toLowerCase())
            User.findOne({username: usernameToUnsubscribeFrom}, '_id', (err, userToUnsubscribeFrom) => {
                if (err) {
                    LOGGER.error('An error occurred when finding user {}: {}', usernameToUnsubscribeFrom, err);
                    next(err);
                } else if (!userToUnsubscribeFrom) {
                    res.status(404).send(`User (username: ${escape(usernameToUnsubscribeFrom)}) not found`);
                } else {
                    userToUnsubscribeFrom.updateOne({$pull: {subscribers: user._id}}, err => {
                        if (err) {
                            LOGGER.error(`An error occurred when removing user {} to user {}'s subscribers: {}`, username, userToUnsubscribeFrom, err);
                            next(err);
                        } else {
                            user.updateOne({$pull: {subscriptions: userToUnsubscribeFrom._id}}, err => {
                                if (err) {
                                    LOGGER.error(`An error occurred when removing user {} to user {}'s subscriptions: {}`, userToUnsubscribeFrom, username, err);
                                    next(err);
                                } else {
                                    res.sendStatus(200);
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

router.get('/:username/stream-info', (req, res, next) => {
    const username = sanitise(req.params.username.toLowerCase());
    User.findOne({username: username},
        'displayName profilePicURL streamInfo.streamKey streamInfo.title streamInfo.genre streamInfo.category streamInfo.tags streamInfo.viewCount',
        (err, user) => {
            if (err) {
                LOGGER.error(`An error occurred when finding user {}'s stream info: {}`, username, err);
                next(err);
            } else if (!user) {
                res.status(404).send(`User (username: ${escape(username)}) not found`);
            } else {
                res.json({
                    displayName: user.displayName,
                    profilePicURL: user.profilePicURL || config.defaultProfilePicURL,
                    streamKey: user.streamInfo.streamKey,
                    title: user.streamInfo.title,
                    genre: user.streamInfo.genre,
                    category: user.streamInfo.category,
                    tags: user.streamInfo.tags,
                    viewCount: user.streamInfo.viewCount
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
            ScheduledStream.find({$or: [
                {
                    user: {$in: [user._id, ...user.subscriptions]},
                    endTime: {$gte: req.query.scheduleStartTime},
                    startTime: {$lte: req.query.scheduleEndTime}
                },
                {
                    _id: {$in: user.nonSubscribedScheduledStreams}
                }
            ]})
            .select('user title startTime endTime')
            .populate({
                path: 'user',
                select: 'username'
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
                                id: scheduleItems.length,
                                group: scheduleGroupId,
                                title: scheduledStream.title || scheduledStreamUsername,
                                start_time: scheduledStream.startTime,
                                end_time: scheduledStream.endTime
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

    const username = sanitise(req.body.username.toLowercase());
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
            } else if (!passwordValidator.validate(req.body.newPassword)) {
                res.json({
                    newPasswordInvalidReason: passwordValidator.getInvalidPasswordMessage()
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

module.exports = router;