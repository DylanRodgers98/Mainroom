const config = require('../../mainroom.config').validation.password;

const lowercaseRegex = `(?=.*[a-z]{${config.minLowercase},})`;
const uppercaseRegex = `(?=.*[A-Z]{${config.minUppercase},})`;
const numericRegex = `(?=.*[0-9]{${config.minNumeric},})`;
const allowedSpecialChars = Array.from(config.allowedSpecialChars).join('\\'); // escape all characters
const specialCharRegex = `(?=.*[${allowedSpecialChars}]{${config.minSpecialChars},})`;

const regex = new RegExp(`^${lowercaseRegex}${uppercaseRegex}${numericRegex}${specialCharRegex}.*$`);

module.exports.validate = password => {
    return password.length >= config.minLength
        && password.length <= config.maxLength
        && regex.test(password);
};