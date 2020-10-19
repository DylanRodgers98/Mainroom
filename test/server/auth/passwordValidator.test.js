const config = require('../../../mainroom.config');

const minLength = 8;
const maxLength = 24;
const minLowercase = 1;
const minUppercase = 1;
const minNumeric = 1;
const minSpecialChars = 1;
const allowedSpecialChars = '*';

const validPassword = 'foo1Bar2hello*world';
const passwordTooShort = 'Foo1*';
const passwordTooLong = 'foo1Bar2hello*world345678';
const passwordHasNoLowercase = 'FOO1BAR2HELLO*WORLD';
const passwordHasNoUppercase = 'foo1bar2hello*world';
const passwordHasNoNumeric = 'fooBar*helloWorld';
const passwordHasNoSpecialChars = 'foo1Bar2helloWorld';
const passwordHasInvalidSpecialChars = 'foo1Bar2hello!world';

const originalPasswordConfig = config.validation.password;
let passwordValidator;

beforeAll(() => {
    config.validation.password = {
        minLength,
        maxLength,
        minLowercase,
        minUppercase,
        minNumeric,
        minSpecialChars,
        allowedSpecialChars
    }
});

beforeEach(() => {
    passwordValidator = require('../../../server/auth/passwordValidator');
});

afterAll(() => {
    config.validation.password = originalPasswordConfig;
});

describe('passwordValidator', () => {
    describe('validate', () => {
        it('should return true when password is valid', () => {
            const isValid = passwordValidator.validate(validPassword);
            expect(isValid).toBeTruthy();
        });

        it('should return false when password is too short', () => {
            const isValid = passwordValidator.validate(passwordTooShort);
            expect(isValid).toBeFalsy();
        });

        it('should return false when password is too long', () => {
            const isValid = passwordValidator.validate(passwordTooLong);
            expect(isValid).toBeFalsy();
        });

        it('should return false when password has no lowercase characters', () => {
            const isValid = passwordValidator.validate(passwordHasNoLowercase);
            expect(isValid).toBeFalsy();
        });

        it('should return false when password has no uppercase characters', () => {
            const isValid = passwordValidator.validate(passwordHasNoUppercase);
            expect(isValid).toBeFalsy();
        });

        it('should return false when password has no numeric characters', () => {
            const isValid = passwordValidator.validate(passwordHasNoNumeric);
            expect(isValid).toBeFalsy();
        });

        it('should return false when password has no special characters', () => {
            const isValid = passwordValidator.validate(passwordHasNoSpecialChars);
            expect(isValid).toBeFalsy();
        });

        it('should return false when password has invalid special characters', () => {
            const isValid = passwordValidator.validate(passwordHasInvalidSpecialChars);
            expect(isValid).toBeFalsy();
        });
    });
});