/* This script accepts a list of paths from the environment variable
 * INPUT_PATH. Each path is separated by a newline. A MD5SUMS file
 * is added to each given directory. Each MD5SUMS file contains the
 * hash of every file recursively found inside the MD5SUMS's parent
 * directory.
 */
"use strict";

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const util = require('./utils.js');

// The code for this function was taken from this blog post:
// https://allenhwkim.medium.com/nodejs-walk-directory-f30a2d8f038f
function walkDir(dir, callback) {
  for (const f of fs.readdirSync(dir)) {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ?
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  }
};

function createMD5SUMS(directory) {
  const file = fs.openSync(path.join(directory, "MD5SUMS"), 'wx');

  let count = 0;
  walkDir(directory, function(filePath) {
    if (path.basename(filePath) != 'MD5SUMS') {
      const contents = fs.readFileSync(filePath, 'utf8');
      const hash = crypto.createHash('md5').update(contents).digest("hex")
      fs.writeSync(file, `${hash}  ${filePath}\n`);
      count++;
    }
  });

  fs.closeSync(file);
  console.log(`${directory}: hashed ${count} files.`);
  total += count;
}

function initGlobalVars() {
  /* variables for keeping track of stats */
  global.total = 0;

  /* Always return 1 on checksum or file errors */
  global.fatal = true;
}

exports.main = function () {
  try {
    initGlobalVars();

    if (process.env['INPUT_CACHE_HIT'] === 'true') {
      console.log('Cache hit no need to build MD5SUMS.')
      process.exit(0);
    }

    for (const directory of process.env['INPUT_PATH'].split('\n')) {
      if (directory.trim() !== '') {
        util.directoryErrorHandler(createMD5SUMS, directory);
      }
    }

    console.log(`Total files hashed ${total}.`);
  } catch (e) {
    util.errorFatal(e);
  }
}

/* istanbul ignore next */
if (require.main === module) {
  exports.main();
}
