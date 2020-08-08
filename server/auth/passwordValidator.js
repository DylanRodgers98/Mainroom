const config = require('../../mainroom.config').validation.password;

const lengthRegex = `(?=.{${config.minLength},${config.maxLength}})`;
const lowercaseRegex = `(?=.*[a-z]{${config.minLowercase},})`;
const uppercaseRegex = `(?=.*[A-Z]{${config.minUppercase},})`;
const numericRegex = `(?=.*[0-9]{${config.minNumeric},})`;
const allowedSpecialChars = Array.from(config.allowedSpecialChars).join('\\'); // escape all characters
const specialCharRegex = `(?=.*[${allowedSpecialChars}]{${config.minSpecialChars},})`;

const regex = new RegExp(`^${lengthRegex}${lowercaseRegex}${uppercaseRegex}${numericRegex}${specialCharRegex}.*$`);

function validate(password) {
    return regex.test(password);
}

module.exports = {
    validate: validate
};