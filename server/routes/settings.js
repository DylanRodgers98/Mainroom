const express = require('express');
const router = express.Router();
const User = require('../database/Schema').User;
const shortid = require('shortid');
const loginChecker = require('connect-ensure-login');

router.get('/all', loginChecker.ensureLoggedIn(), (req, res) => {
   User.findOne({email: req.user.email}, (err, user) => {
      if (!err) {
          res.json({
              stream_key: user.stream_key,
              stream_title: user.stream_title,
              stream_genre: user.stream_genre,
              stream_tags: user.stream_tags
          });
      }
   });
});

router.post('/all', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOneAndUpdate({
        email: req.user.email
    }, {
        stream_title: req.body.stream_title,
        stream_genre: req.body.stream_genre,
        stream_tags: req.body.stream_tags
    }, {
        new: true,
    }, (err, user) => {
        if (!err) {
            res.json({
                stream_title: user.stream_title,
                stream_genre: user.stream_genre,
                stream_tags: user.stream_tags
            });
        }
    });
});

router.post('/stream_key', loginChecker.ensureLoggedIn(), (req, res) => {
    User.findOneAndUpdate({
        email: req.user.email
    }, {
        stream_key: shortid.generate()
    }, {
        new: true,
    }, (err, user) => {
        if (!err) {
            res.json({
                stream_key: user.stream_key
            })
        }
    });
});

module.exports = router;

