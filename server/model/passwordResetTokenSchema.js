const {Schema} = require('mongoose');

const PasswordResetToken = new Schema({
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    tokenHash: String,
    expires: {type: Date, index: {expires: 0}}
});

module.exports = PasswordResetToken;