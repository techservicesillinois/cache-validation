"use strict";

const fs = require('fs');
const path = require('path');

exports.walkPath = function (Path, callback) {
  if (fs.statSync(Path).isDirectory()) {
    for (const file of fs.readdirSync(Path)) {
      const filePath = path.join(Path, file);
      exports.walkPath(filePath, callback);
    }
  }

  callback(Path);
}

exports.touch = function (directory) {
  const now = new Date();

  exports.walkPath(directory, function(filePath) {
    console.log("touch " + filePath);
    fs.utimesSync(filePath, now, now);
  });
}

exports.error = function (e) {
  exports.errorMessage(e.message);
}

exports.errorFatal = function (e) {
  process.exitCode = 1;
  console.log(e.message);
}

exports.errorMessage = function (message) {
  if (fatal) {
    process.exitCode = 1;
  }

  console.log(message);
}

exports.fileErrorHandler = function (func, ...args) {
  return errorHandler("File not found", func, ...args);
}

exports.directoryErrorHandler = function (func, ...args) {
  return errorHandler("Directory not found", func, ...args);
}

function errorHandler(message, func, ...args) {
  try {
    return func(...args)
  } catch(e) {
    const filePath = args[0];

    if (e.code === 'ENOENT') {
      exports.errorMessage(`${filePath}: ${message}!`);
    } else {
      exports.errorFatal(e);
    }
  }
}
