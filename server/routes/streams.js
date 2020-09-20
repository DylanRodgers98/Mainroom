const express = require('express');
const router = express.Router();
const {User} = require('../database/schemas');
const loginChecker = require('connect-ensure-login');
const _ = require('lodash');
const sanitise = require('mongo-sanitize');

router.get('/', loginChecker.ensureLoggedIn(), async (req, res, next) => {
    if (req.query.streamKeys) {
        const query = {
            'streamInfo.streamKey': {$in: req.query.streamKeys}
        };
        if (req.query.searchQuery) {
            const sanitisedQuery = sanitise(req.query.searchQuery);
            const escapedQuery = _.escapeRegExp(sanitisedQuery)
            const searchQuery = new RegExp(`^${escapedQuery}$`, 'i');
            query.$or = [{title: searchQuery}, {tags: searchQuery}, {username: searchQuery}];
        }
        if (req.query.genre) {
            query['streamInfo.genre'] = sanitise(req.query.genre);
        }
        if (req.query.category) {
            query['streamInfo.category'] = sanitise(req.query.category);
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