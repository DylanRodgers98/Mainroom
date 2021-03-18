const LAUNCH_DATE = new Date('Mar 19, 2021 00:00:00').getTime();

module.exports.renderCountdown = (req, res, next) => {
    if (Date.now() < LAUNCH_DATE) {
        res.render('countdown');
    } else {
        next();
    }
}
