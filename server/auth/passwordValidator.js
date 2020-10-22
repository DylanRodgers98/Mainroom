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

module.exports.getInvalidPasswordMessage = () => {
    const lines = ['Invalid password. Password must contain:'];

    const minLength = config.validation.password.minLength;
    const maxLength = config.validation.password.maxLength;
    lines.push(`• Between ${minLength}-${maxLength} characters`);

    const minLowercase = config.validation.password.minLowercase;
    lines.push(`• At least ${minLowercase} lowercase character${minLowercase > 1 ? 's' : ''}`);

    const minUppercase = config.validation.password.minUppercase;
    lines.push(`• At least ${minUppercase} uppercase character${minUppercase > 1 ? 's' : ''}`);

    const minNumeric = config.validation.password.minUppercase;
    lines.push(`• At least ${minNumeric} number${minNumeric > 1 ? 's' : ''}`);

    const minSpecialChars = config.validation.password.minSpecialChars;
    const allowedSpecialChars = Array.from(config.validation.password.allowedSpecialChars).join(' ');
    lines.push(`• At least ${minSpecialChars} of the following special characters: ${allowedSpecialChars}`);

    return lines;
};