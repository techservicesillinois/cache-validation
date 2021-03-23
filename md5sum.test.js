/* Unit tests for md5sum.js */
const fs = require("fs");
const path = require('path');

const md5sum = require('./md5sum.js');
const util = require('./testUtils.js');

beforeEach(() => {
  util.beforeEach();
});

afterEach(() => {
  util.afterEach();
});

/* Test return code, console output, and MD5SUMS file match expected
 * values.
 *
 * hashes - list of lines expected to be in MD5SUMS file.
 */
function expectOutput(hashes) {
  expect(process.exitCode).toBe(0);
  expect(console.log.mock.calls[0][0])
    .toBe(`good: hashed ${hashes.length} files.`);
  expect(console.log.mock.calls[1][0])
    .toBe(`Total files hashed ${hashes.length}.`);

  const MD5SUMS = fs.readFileSync(path.join('good', 'MD5SUMS'), 'utf8')
    .split('\n');
  expect(MD5SUMS).toEqual(expect.arrayContaining([
    hashes[0],
    hashes[1],
    '',
  ]));
  expect(MD5SUMS.length).toBe(hashes.length + 1);
  expect(fs.readdirSync(path.join(tmpdir.name, 'good')).length)
    .toBe(hashes.length + 1);
}

test('generate MD5SUMS file with 2 files one nested deeply', () => {
  process.env['INPUT_CACHE_HIT'] = 'false';
  process.env['INPUT_PATH'] = 'good\n  \n'; //empty lines should be ignored

  const [hashes, stats] = util.setupGoodDirectory({MD5SUMS: false});
  md5sum.main();
  expectOutput(hashes);
});

test('generate empty MD5SUMS file in an empty directory', () => {
  process.env['INPUT_CACHE_HIT'] = 'false';
  process.env['INPUT_PATH'] = tmpdir.name;

  md5sum.main();

  expect(process.exitCode).toBe(0);
  expect(console.log.mock.calls[0][0]).toBe(`${tmpdir.name}: hashed 0 files.`);
  expect(console.log.mock.calls[1][0]).toBe('Total files hashed 0.');
  expect(fs.statSync(path.join(tmpdir.name, 'MD5SUMS')).size).toBe(0);
  expect(fs.readdirSync(tmpdir.name).length).toBe(1)
});

test('fail if MD5SUM exists', () => {
  process.env['INPUT_CACHE_HIT'] = 'false';
  process.env['INPUT_PATH'] = 'good';

  const [hashes, stats] = util.setupGoodDirectory({MD5SUMS: true});
  md5sum.main();

  expect(process.exitCode).toBe(1);
  expect(console.log.mock.calls[0][0])
    .toBe("EEXIST: file already exists, open " +
          `'${path.join("good", "MD5SUMS")}'`);
});

test('fail on nonexistent path', () => {
  process.env['INPUT_CACHE_HIT'] = 'false';
  process.env['INPUT_PATH'] = 'nonexistent';

  md5sum.main();

  expect(process.exitCode).toBe(1);
  expect(console.log.mock.calls[0][0])
    .toBe("nonexistent: Directory not found!");
});

test('Do not generate MD5SUMS file if INPUT_CACHE_HIT is true', () => {
  process.env['INPUT_CACHE_HIT'] = 'true';
  process.env['INPUT_PATH'] = 'bad';

  md5sum.main();

  expect(process.exit.mock.calls[0][0]).toBe(0);
  expect(console.log.mock.calls[0][0])
    .toBe("Cache hit no need to build MD5SUMS.");
});
