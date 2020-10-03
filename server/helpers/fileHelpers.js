const path = require('path');
const fs = require('fs');

function resolveFilePath(filePath) {
    return isPathAbsolute(filePath) ? filePath
        : path.resolve(process.cwd(), filePath);
}

function isPathAbsolute(path) {
    return /^(?:\/|[a-z]+:\/\/)/.test(path);
}

function decodeFile(filePath, encoding) {
    const fileContents = fs.readFileSync(filePath, 'utf-8');
    return Buffer.from(fileContents, encoding).toString();
}

module.exports = {
    resolveFilePath: resolveFilePath,
    decodeFile: decodeFile
}