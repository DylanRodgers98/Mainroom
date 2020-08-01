module.exports = {
    moduleNameMapper: {
        '\\.(css|scss|less)$': '<rootDir>/test/cssStub.js',
    },
    setupFiles: [
        '<rootDir>/jest.init.js'
    ],
    collectCoverageFrom: [
        '<rootDir>/(client|server)/**/*.js'
    ]
};