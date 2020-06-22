const mongoose = require('mongoose');

exports.User = mongoose.model('User', require('./userSchema'));
exports.Stream = mongoose.model('Stream', require('./streamSchema'));