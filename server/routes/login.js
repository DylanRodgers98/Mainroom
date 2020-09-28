const express = require('express');
const router = express.Router();
const passport = require('passport');
const loginChecker = require('connect-ensure-login');

router.get('/', loginChecker.ensureLoggedOut(), (req, res) => {
    res.render('login', {
        user: null,
        errors: {
            login: req.flash('login')
        },
        csrfToken: req.csrfToken(),
        redirectTo: req.query.redirectTo
    });
});

router.post('/', loginChecker.ensureLoggedOut(), (req, res, next) => {
    passport.authenticate('localLogin', {
        successRedirect: req.body.redirectTo || '/',
        failureRedirect: '/login',
        failureFlash: true
    })(req, res, next);
});

module.exports = router;

