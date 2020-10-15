const mongoose = require('mongoose');

exports.User = mongoose.model('User', require('./userSchema'));
exports.ScheduledStream = mongoose.model('ScheduledStream', require('./scheduledStreamSchema'));