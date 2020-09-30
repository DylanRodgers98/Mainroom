const path = require('path');
const fs = require('fs');

function resolveFilePath(filePath) {
    return isPathAbsolute(filePath) ? filePath
        : path.resolve(process.cwd(), filePath);
}

function isPathAbsolute(path) {
    return /^(?:\/|[a-z]+:\/\/)/.test(path);
}

function decodeBase64File(filePath) {
    const fileContents = fs.readFileSync(filePath, 'utf-8');
    return Buffer.from(fileContents, 'base64').toString();
}

module.exports = {
    resolveFilePath: resolveFilePath,
    decodeBase64File: decodeBase64File
}