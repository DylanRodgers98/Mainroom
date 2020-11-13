const mongoose = require('mongoose');

exports.User = mongoose.model('User', require('./userSchema'));
exports.ScheduledStream = mongoose.model('ScheduledStream', require('./scheduledStreamSchema'));
exports.PasswordResetToken = mongoose.model('PasswordResetToken', require('./passwordResetTokenSchema'));
exports.RecordedStream = mongoose.model('RecordedStream', require('./recordedStreamSchema'));