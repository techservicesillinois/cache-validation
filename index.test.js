/* Unit tests for index.js */
const fs = require('fs')
const path = require('path');

const index = require('./index.js');
const util = require('./testUtils.js');

beforeEach(() => {
  util.beforeEach();
});

afterEach(() => {
  util.afterEach();
});

/* Test return code and output match expected values
 *
 * stats.invalid - expected number of invalid files
 * stats.missing - expected number of missing files
 * stats.valid - expected number of valid files
 * object.valid - expected value of output valid
 * object.exitCode - expected return code
 */
function expectOutput(stats, object) {
  expect(process.exitCode).toBe(object.exitCode);

  /* The three lines next to last should display stats */
  lastLine = console.log.mock.calls.length - 1;
  expect(console.log.mock.calls[lastLine-3][0])
    .toBe(`Invalid file(s): ${stats.invalid}`);
  expect(console.log.mock.calls[lastLine-2][0])
    .toBe(`Missing file(s): ${stats.missing}`);
  expect(console.log.mock.calls[lastLine-1][0])
    .toBe(`Valid file(s): ${stats.valid}`);
  /* Last line should set output values */
  expect(console.log.mock.calls[lastLine][0])
    .toBe(`::set-output name=valid::${object.valid}`);
}

async function testGoodDir(object) {
  process.env['INPUT_CACHE_HIT'] = 'true';
  process.env['INPUT_PATH'] = object.path;
  process.env['INPUT_TOUCH'] = object.touch;

  const [hashes, stats, paths, time] = util.setupGoodDirectory(
    {MD5SUMS: true});
  await index.main();
  expectOutput(stats, {exitCode: 0, valid: 'true'})
  expect(fs.existsSync('good')).toBe(true);

  for (const path of paths) {
    const mtime = [path, fs.statSync(path).mtime.getTime()];
    const epic = [path, 0];

    // Expect paths' atime and mtime to be the Unix epic time (0)
    // unless touched. Not checking atime because Make only looks
    // at mtime, and the behavior of atime is system dependent.
    if (object.touch) {
      expect(mtime).not.toEqual(epic);
    } else {
      expect(mtime).toEqual(epic);
    }
  }
}

test('pass 2 valid files one nested deeply', async () => {
  await testGoodDir({path: 'good\n  \n'}); //empty lines should be ignored
});

test('check that touch option works', async () => {
  await testGoodDir({path: 'good', touch: true});
});

async function testBadMissingFile(object) {
  process.env['INPUT_CACHE_HIT'] = 'true';
  process.env['INPUT_PATH'] = 'good';
  process.env['INPUT_FATAL'] = object.fatal;
  process.env['INPUT_REMOVE_INVALID_PATHS'] = object.remove_invalid_paths;
  process.env['INPUT_REMOVE_INVALID_FILES'] = object.remove_invalid_files;

  const [hashes, stats, /* ignore paths */] = util.setupBadDirectory();
  await index.main();

  const foo = path.join('good', 'better', 'best', 'foo');
  const bar = path.join('good', 'bar');

  expect(console.log.mock.calls)
    .toEqual(expect.arrayContaining([
      [`${foo}: contents have changed!`],
      [`${bar}: File not found!`],
    ]));

  // If remove_invalid_paths is true then directory good should not exist
  expect(fs.existsSync('good')).toBe(!object.remove_invalid_paths);

  // If remove_invalid_files is true then file foo should not exist
  expect(fs.existsSync(foo)).toBe(!object.remove_invalid_files &&
                                  !object.remove_invalid_paths);

  // File bar should never exist
  expect(fs.existsSync(bar)).toBe(false);;

  /* Exit code 1 if INPUT_FATAL is true, 0 if false */
  expectOutput(stats, {exitCode: fatal ? 1 : 0, valid: 'false'});
}

test('fail & return error code 1 w/fatal set to true', async () => {
  await testBadMissingFile({fatal: true});  // INPUT_FATAL = true
});

test('fail & return error code 0 w/fatal set to false', async () => {
  await testBadMissingFile({fatal: false});  // INPUT_FATAL = false
});

test('fail & remove path w/ remove_invalid_paths set to true', async () => {
  await testBadMissingFile({fatal: false, remove_invalid_paths: true});
});

test('fail & remove file w/ remove_invalid_files set to true', async () => {
  await testBadMissingFile({fatal: false, remove_invalid_files: true});
});

async function testNoChecksumFile(fatal) {
  process.env['INPUT_CACHE_HIT'] = 'true';
  process.env['INPUT_PATH'] = 'good';
  process.env['INPUT_FATAL'] = fatal;

  const [hashes, stats, , ] = util.setupGoodDirectory({MD5SUMS: false});
  stats.valid = 0;
  stats.missing = 1;

  await index.main();

  let MD5SUMS = path.join("good", "MD5SUMS");
  if (process.platform === "win32") {
    MD5SUMS = path.resolve(MD5SUMS); // Windows returns a full path...
  }
  expect(console.log.mock.calls[0][0])
    .toBe(`ENOENT: no such file or directory, open '${MD5SUMS}'`);
  expectOutput(stats, {exitCode: fatal === 'true' ? 1 : 0, valid: 'false'});
}

test('fail on nonexistent MD5SUM & return 1 w/fatal set to true', async () => {
  await testNoChecksumFile('true');
});

test('fail on nonexistent MD5SUM & return 0 w/fatal set to false', async () => {
  await testNoChecksumFile('false');
});

test('Do not check MD5SUMS file if INPUT_CACHE_HIT is not true', async () => {
  process.env['INPUT_CACHE_HIT'] = 'false';
  process.env['INPUT_PATH'] = 'bad';

  await index.main();

  expect(process.exit.mock.calls[0][0]).toBe(0);
  expect(console.log.mock.calls[0][0])
    .toBe("Cache miss: nothing to validate.");
});
