/* This script accepts a list of paths from the environment variable
 * INPUT_PATH. Each path is separated by a newline. It looks for a
 * MD5SUMS file in each given directory and verifies the contents
 * of the file. If the file does not exist an error is thrown.
 */

"use strict";

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const util = require('./utils.js');

function checkHash(filePath, old_hash) {
  missing++;
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const hash = crypto.createHash('md5').update(fileContents).digest("hex");
  missing--;

  if (hash !== old_hash) {
    invalid++;
    util.errorMessage(`${filePath}: contents have changed!`);
  } else {
    valid++;
  }
}

function checkHashes(filePath) {
  return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath)
        .on('error', (e) => {
          util.error(e);
          missing++;
          resolve();
        })
        .on('close', resolve)

      const readInterface = readline.createInterface({
        input: stream,
        console: false
      })

      readInterface.on('line', function(line) {
        const [hash, filePath] = line.split('  ');

        util.fileErrorHandler(checkHash, filePath, hash);
      });
  });
}

function initGlobalVars() {
  /* global variables for keeping track of stats */
  global.invalid = 0;
  global.missing = 0;
  global.valid = 0;

  /* Return 1 on checksum or file errors if true, otherwise 0 */
  global.fatal = false;
  global.remove_invalid_paths = false;
}

function stats() {
  console.log(`Invalid file(s): ${invalid}`)
  console.log(`Missing file(s): ${missing}`)
  console.log(`Valid file(s): ${valid}`)
  if (invalid === 0 && missing === 0) {
    console.log('::set-output name=valid::true')
  } else {
    console.log('::set-output name=valid::false')
  }
}

exports.main = async function () {
  try {
    initGlobalVars();

    if (process.env['INPUT_CACHE_HIT'] !== 'true') {
      console.log('Cache miss: nothing to validate.');
      process.exit(0);
    }

    if (process.env['INPUT_FATAL'] === 'true') {
      fatal = 'true';
    }

    if (process.env['INPUT_REMOVE_INVALID_PATHS'] === 'true') {
      remove_invalid_paths = 'true';
    }

    for (const directory of process.env['INPUT_PATH'].split('\n')) {
      if (directory.trim() !== '') {
        await checkHashes(path.join(directory, "MD5SUMS"));
        if (remove_invalid_paths && (missing > 0 || invalid > 0)) {
          fs.rmdirSync(directory, { recursive: true });
          console.log("Removed invalid path: ${directory}");
        }
      }
    }

    stats();
  } catch (e) {
    util.errorFatal(e);
  }
}

/* istanbul ignore next */
if (require.main === module) {
  exports.main();
}
