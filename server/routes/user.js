const express = require('express');
const router = express.Router();
const User = require('../database/schema').User;
const loginChecker = require('connect-ensure-login');

router.get('/loggedIn', loginChecker.ensureLoggedIn(), (req, res) => {
    res.json({username: req.user.username});
});

router.get('/', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOne({username: req.query.username}, (err, user) => {
        if (!err && user) {
            res.json({
                username: user.username,
                location: user.location,
                bio: user.bio,
                numOfSubscribers: user.subscribers.length,
                schedule: user.schedule
            });
        }
    });
});

router.get('/subscriptions', loginChecker.ensureLoggedIn(), (req, res) => {
    const username = req.query.username ? req.query.username : req.user.username;
    User.findOne({username: username}, (err, user) => {
        if (!err && user) {
            res.json({
                subscriptions: user.subscriptions
            });
        }
    });
});

router.get('/schedule', loginChecker.ensureLoggedIn(), (req, res) => {
    const username = req.query.username ? req.query.username : req.user.username;
    User.findOne({username: username}, (err, user) => {
        if (!err && user) {
            res.json({
                username: user.username,
                schedule: user.schedule
            });
        }
    });
});

router.get('/subscribedTo', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOne({username: req.user.username}, (err, user) => {
        if (!err && user) {
            res.json({
                subscribed: user.subscriptions.includes(req.query.otherUser)
            });
        }
    });
});

router.post('/subscribe', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOneAndUpdate({
        username: req.user.username
    }, {
        $push: { subscriptions: req.body.userToSubscribeTo }
    },(err, user) => {
        if (err) {
            return res.sendStatus(500);
        }
    });

    User.findOneAndUpdate({
        username: req.body.userToSubscribeTo
    }, {
        $push: { subscribers: req.user.username }
    },(err, user) => {
        if (err) {
            return res.sendStatus(500);
        }
    });

    res.sendStatus(200);
});

router.post('/unsubscribe', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOneAndUpdate({
        username: req.user.username
    }, {
        $pull: { subscriptions: req.body.userToUnsubscribeFrom }
    }, (err, user) => {
        if (err) {
            return res.sendStatus(500);
        }
    });

    User.findOneAndUpdate({
        username: req.body.userToUnsubscribeFrom
    }, {
        $pull: { subscribers: req.user.username }
    },(err, user) => {
        if (err) {
            return res.sendStatus(500);
        }
    });

    res.sendStatus(200);
});

//TODO: create get route for profile pic
// router.get('/profilePic', (req, res) => {
//     res.sendFile();
// });

module.exports = router;