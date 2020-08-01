const config = require('../../mainroom.config');

function validate(password) {
    return buildRegex().test(password);
}

function buildRegex() {
    const minLength = config.validation.password.minLength;
    const maxLength = config.validation.password.maxLength;
    const lengthRegex = `(?=.{${minLength},${maxLength}})`;

    const minLowercase = config.validation.password.minLowercase;
    const lowercaseRegex = `(?=.*[a-z]{${minLowercase},})`;

    const minUppercase = config.validation.password.minUppercase;
    const uppercaseRegex = `(?=.*[A-Z]{${minUppercase},})`;

    const minNumeric = config.validation.password.minNumeric;
    const numericRegex = `(?=.*[0-9]{${minNumeric},})`;

    const minSpecialChars = config.validation.password.minSpecialChars;
    const allowedSpecialChars = Array.from(config.validation.password.allowedSpecialChars).join('\\'); // escape all characters
    const specialCharRegex = `(?=.*[${allowedSpecialChars}]{${minSpecialChars},})`;

    return new RegExp(`^${lengthRegex}${lowercaseRegex}${uppercaseRegex}${numericRegex}${specialCharRegex}.*$`);
}

module.exports = {
    validate: validate
};