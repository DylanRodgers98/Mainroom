module.exports.sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports.overrideEnvironmentVariables = overrides => ({
    andDo: async testCallback => await overrideEnvVarsAndDo(overrides, testCallback)
});

async function overrideEnvVarsAndDo(overrides, testCallback) {
    const originalEnvVars = new Map();

    Object.entries(overrides).forEach(entry => {
        const key = entry[0];
        const value = entry[1];

        const originalEnvVar = process.env[key];
        originalEnvVars.set(key, originalEnvVar);

        process.env[key] = value;
    });

    await testCallback();

    originalEnvVars.forEach((value, key) => {
        process.env[key] = value;
    });
}