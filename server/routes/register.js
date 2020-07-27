const express = require('express');
const router = express.Router();
const passport = require('passport');
const loginChecker = require('connect-ensure-login');

router.get('/', loginChecker.ensureLoggedOut(), (req, res) => {
    res.render('register', {
        user: null,
        errors: {
            username: req.flash('username'),
            email: req.flash('email'),
            password: req.flash('password'),
            confirmPassword: req.flash('confirmPassword')
        }
    });
});

router.post('/', loginChecker.ensureLoggedOut(),
    passport.authenticate('localRegister', {
        successRedirect: '/',
        failureRedirect: '/register',
        failureFlash: true
    })
);

module.exports = router;