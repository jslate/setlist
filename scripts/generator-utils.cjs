#!/usr/bin/env node
const fs = require('fs');

function exists(filePath) {
  return fs.existsSync(filePath);
}

function getMtimeMs(filePath) {
  return fs.statSync(filePath).mtimeMs;
}

function isOutputStale(outputPath, inputPaths) {
  if (!exists(outputPath)) return true;

  const outputMtime = getMtimeMs(outputPath);

  return inputPaths.some((inputPath) => {
    if (!exists(inputPath)) return true;
    return getMtimeMs(inputPath) > outputMtime;
  });
}

function copyIfStale(srcPath, dstPath) {
  if (isOutputStale(dstPath, [srcPath])) {
    fs.copyFileSync(srcPath, dstPath);
    return true;
  }

  return false;
}

module.exports = {
  copyIfStale,
  isOutputStale,
};
