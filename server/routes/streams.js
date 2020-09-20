const express = require('express');
const router = express.Router();
const {User} = require('../database/schemas');
const loginChecker = require('connect-ensure-login');
const _ = require('lodash');

router.get('/', loginChecker.ensureLoggedIn(), async (req, res, next) => {
    if (req.query.streamKeys) {
        const query = {
            'streamInfo.streamKey': {$in: req.query.streamKeys}
        };
        if (req.query.searchQuery) {
            const searchQuery = new RegExp(`^${_.escapeRegExp(req.query.searchQuery)}$`, 'i');
            query.$or = [{title: searchQuery}, {tags: searchQuery}, {username: searchQuery}];
        }
        if (req.query.genre) {
            query['streamInfo.genre'] = req.query.genre;
        }
        if (req.query.category) {
            query['streamInfo.category'] = req.query.category;
        }
        User.find(query, 'username displayName streamInfo.streamKey', (err, users) => {
            if (err) {
                return next(err);
            }
            if (users) {
                return res.json(users.map(user => {
                    return {
                        username: user.username,
                        displayName: user.displayName,
                        streamKey: user.streamInfo.streamKey
                    };
                }));
            }
        });
    }
    res.json({});
});

module.exports = router;