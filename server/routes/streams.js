const express = require('express');
const router = express.Router();
const {User} = require('../database/schemas');
const loginChecker = require('connect-ensure-login');
const _ = require('lodash');

router.get('/', loginChecker.ensureLoggedIn(), async (req, res) => {
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
        const users = await User.find(query, 'username streamInfo.streamKey');
        if (users) {
            const streamInfo = users.map(user => {
                return {
                    username: user.username,
                    streamKey: user.streamInfo.streamKey
                };
            })
            res.json(streamInfo);
        }
    }
});

module.exports = router;