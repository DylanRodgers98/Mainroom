const express = require('express');
const router = express.Router();
const passport = require('passport');
const loginChecker = require('connect-ensure-login');

router.get('/', loginChecker.ensureLoggedOut(), (req, res) => {
    res.render('login', {
        user: null,
        errors: {
            email: req.flash('email'),
            password: req.flash('password')
        }
    });
});

router.post('/', passport.authenticate('localLogin', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}));

module.exports = router;

