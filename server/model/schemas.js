const mongoose = require('mongoose');

exports.RecordedStream = mongoose.model('RecordedStream', require('./recordedStreamSchema'));
exports.ScheduledStream = mongoose.model('ScheduledStream', require('./scheduledStreamSchema'));
exports.User = mongoose.model('User', require('./userSchema'));
exports.PasswordResetToken = mongoose.model('PasswordResetToken', require('./passwordResetTokenSchema'));