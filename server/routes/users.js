const express = require('express');
const router = express.Router();
const config = require('../../mainroom.config');
const {User} = require('../database/schemas');
const loginChecker = require('connect-ensure-login');
const sanitise = require('mongo-sanitize');
const escape = require('escape-html');
const shortid = require('shortid');
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const LOGGER = require('../../logger')('./server/routes/users.js');

const s3 = new AWS.S3();

router.get('/logged-in', (req, res) => {
    res.json(!req.user ? {} : {
        _id: req.user._id,
        username: req.user.username
    });
});

router.get('/:username', (req, res, next) => {
    const username = sanitise(req.params.username.toLowerCase());
    User.findOne({username: username}, 'username displayName location bio links subscribers scheduledStreams')
        .populate({
            path: 'scheduledStreams',
            select: 'title startTime endTime',
            match: {
                endTime: {$gte: req.query.scheduleStartTime},
                startTime: {$lte: req.query.scheduleEndTime}
            }
        })
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
                    numOfSubscribers: user.subscribers.length,
                    scheduledStreams: user.scheduledStreams
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

const s3UploadProfilePic = multer({
    storage: multerS3({
        s3: s3,
        bucket: config.storage.s3.buckets.staticContent,
        key: (req, file, cb) => {
            cb(null, `${config.storage.s3.keyPaths.profilePics}/${uuidv4()}.${mime.extension(file.mimetype)}`);
        }
    })
}).single('profilePic');

router.put('/:username/profile-pic', (req, res, next) => {
    const username = sanitise(req.params.username);
    s3UploadProfilePic(req, res, err => {
        if (err) {
            LOGGER.error('An error occurred when uploading profile pic to S3 for user {}: {}', username, err);
            next(err);
        } else {
            User.findOneAndUpdate({
                username: username
            }, {
                profilePicURL: req.file.location
            }, (err, user) => {
                if (err) {
                    LOGGER.error('An error occurred when updating user {}: {}', username, err);
                    next(err);
                } else if (!user) {
                    res.status(404).send(`User (username: ${escape(username)}) not found`);
                } else {
                    res.sendStatus(200);
                }
            })
        }
    })
});

router.get('/:username/subscribers', (req, res, next) => {
    const username = sanitise(req.params.username.toLowerCase());
    User.findOne({username: username}, 'subscribers')
        .populate({
            path: 'subscribers',
            select: 'username'
        })
        .exec((err, user) => {
            if (err) {
                LOGGER.error('An error occurred when getting subscribers for user {}: {}', username, err);
                next(err);
            } else if (!user) {
                res.status(404).send(`User (username: ${escape(username)}) not found`);
            } else {
                res.json({
                    subscribers: user.subscribers
                });
            }
        });
});

router.get('/:username/subscriptions', (req, res, next) => {
    const username = sanitise(req.params.username.toLowerCase());
    User.findOne({username: username}, 'subscriptions')
        .populate({
            path: 'subscriptions',
            select: 'username'
        })
        .exec((err, user) => {
            if (err) {
                LOGGER.error('An error occurred when getting subscriptions for user {}: {}', username, err);
                next(err);
            } else if (!user) {
                res.status(404).send(`User (username: ${escape(username)}) not found`);
            } else {
                res.json({
                    subscriptions: user.subscriptions
                });
            }
        });
});

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

router.patch('/:username/subscribe/:userToSubscribeTo', loginChecker.ensureLoggedIn(), (req, res, next) => {
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

router.patch('/:username/unsubscribe/:userToUnsubscribeFrom', loginChecker.ensureLoggedIn(), (req, res, next) => {
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
        'displayName streamInfo.streamKey streamInfo.title streamInfo.genre streamInfo.category streamInfo.tags',
        (err, user) => {
            if (err) {
                LOGGER.error(`An error occurred when finding user {}'s stream info: {}`, username, err);
                next(err);
            } else if (!user) {
                res.status(404).send(`User (username: ${escape(username)}) not found`);
            } else {
                res.json({
                    displayName: user.displayName,
                    streamKey: user.streamInfo.streamKey,
                    title: user.streamInfo.title,
                    genre: user.streamInfo.genre,
                    category: user.streamInfo.category,
                    tags: user.streamInfo.tags
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
    User.findOne({username: username}, 'username scheduledStreams subscriptions')
        .populate({
            path: 'scheduledStreams',
            select: 'title startTime endTime',
            match: {
                endTime: {$gte: req.query.scheduleStartTime},
                startTime: {$lte: req.query.scheduleEndTime}
            }
        })
        .populate({
            path: 'subscriptions',
            select: 'username scheduledStreams.title scheduledStreams.startTime scheduledStreams.endTime',
            match: {
                'scheduledStreams.endTime': {$gte: req.query.scheduleStartTime},
                'scheduledStreams.startTime': {$lte: req.query.scheduleEndTime}
            }
        })
        .exec((err, user) => {
            if (err) {
                LOGGER.error(`An error occurred when getting user {}'s schedule: {}`, username, err);
                next(err);
            } else if (!user) {
                res.status(404).send(`User (username: ${escape(username)}) not found`);
            } else {
                res.json(user);
            }
        });
});

router.get('/:userId/settings', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const userId = sanitise(req.params.userId);
    User.findById(userId, 'username email').exec((err, user) => {
        if (err) {
            LOGGER.error(`An error occurred when finding user with _id {}: {}`, userId, err);
            next(err);
        } else if (!user) {
            res.status(404).send(`User (username: ${escape(userId)}) not found`);
        } else {
            res.json({
                username: user.username,
                email: user.email
            });
        }
    });
});

router.patch('/:userId/settings', loginChecker.ensureLoggedIn(), (req, res, next) => {
    const findQuery = {$or: []};
    const updateQuery = {};

    if (req.body.username) {
        const username = sanitise(req.body.username);
        findQuery.$or.push({username: username});
        updateQuery.username = username;
    }
    if (req.body.email) {
        const email = sanitise(req.body.email);
        findQuery.$or.push({email: email});
        updateQuery.email = email;
    }

    if (findQuery.$or.length) {
        User.find(findQuery, 'username email', (err, users) => {
            if (err) {
                LOGGER.error(`An error occurred when finding users with query {}: {}`, JSON.stringify(findQuery), err);
                next(err);
            } else if (users) {
                const invalidReasons = {};
                for (const user of users) {
                    if (user.email === req.body.email) {
                        invalidReasons.emailInvalidReason = 'Email is already taken';
                    }
                    if (user.username === req.body.username) {
                        invalidReasons.usernameInvalidReason = 'Username is already taken';
                    }
                }
                if (invalidReasons.emailInvalidReason || invalidReasons.usernameInvalidReason) {
                    res.json(invalidReasons);
                } else {
                    const userId = sanitise(req.params.userId);
                    User.findByIdAndUpdate(userId, updateQuery, (err, user) => {
                        if (err) {
                            LOGGER.error(`An error occurred when updating username and/or email for user with _id {}: {}`, userId, err);
                            next(err);
                        } else if (!user) {
                            res.status(404).send(`User (_id: ${escape(userId)}) not found`);
                        } else {
                            res.sendStatus(200);
                        }
                    });
                }
            }
        });
    }
});

router.patch('/:userId/password', loginChecker.ensureLoggedIn(), (req, res, next) => {
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
                    newPasswordInvalidReason: getNewPasswordInvalidReason()
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

function getNewPasswordInvalidReason() {
    const lines = ['Invalid password. Password must contain:'];

    const minLength = config.validation.password.minLength;
    const maxLength = config.validation.password.maxLength;
    lines.push(`• Between ${minLength}-${maxLength} characters`);

    const minLowercase = config.validation.password.minLowercase;
    lines.push(`• At least ${minLowercase} lowercase character${minLowercase > 1 ? 's' : ''}`);

    const minUppercase = config.validation.password.minUppercase;
    lines.push(`• At least ${minUppercase} uppercase character${minUppercase > 1 ? 's' : ''}`);

    const minNumeric = config.validation.password.minUppercase;
    lines.push(`• At least ${minNumeric} number${minNumeric > 1 ? 's' : ''}`);

    const minSpecialChars = config.validation.password.minSpecialChars;
    const allowedSpecialChars = Array.from(config.validation.password.allowedSpecialChars).join(' ');
    lines.push(`• At least ${minSpecialChars} of the following special characters: ${allowedSpecialChars}`);

    return lines;
}

module.exports = router;