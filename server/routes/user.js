const express = require('express');
const router = express.Router();
const loginChecker = require('connect-ensure-login');

router.get('/loggedin', loginChecker.ensureLoggedIn(), (req, res) => {
    res.json({username: req.user.username});
});

module.exports = router;