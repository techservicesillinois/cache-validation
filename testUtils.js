const fs = require("fs");
const path = require('path');
const tmp = require('tmp');

// Backup console.log & process.exit
const console_log = console.log;
const process_exit = process.exit;
const process_exitCode = process.exitCode;

exports.print = console_log;

// Remove all temp directories recursively on exit
tmp.setGracefulCleanup({ unsafeCleanup: true });

exports.beforeEach = function () {
  exports.cleanEnv();

  console.log = jest.fn();
  process.exit = jest.fn();

  cwd = process.cwd();
  tmpdir = tmp.dirSync({ template: 'cache-validation-test-XXXXXX',
    unsafeCleanup: true });
  process.chdir(tmpdir.name);
};

exports.afterEach = function () {
  console.log = console_log;
  process.exit = process_exit;
  process.exitCode = process_exitCode;

  process.chdir(cwd);
  tmpdir.removeCallback();
  exports.cleanEnv();
};

exports.cleanEnv = function () {
  delete process.env['INPUT_CACHE_HIT'];
  delete process.env['INPUT_PATH'];
  delete process.env['INPUT_FATAL'];
  process.exitCode = 0;
}

exports.setupGoodDirectory = function (object) {
  const bar = path.join('good', 'bar');
  const foo = path.join('good', 'better', 'best', 'foo');
  const paths = [bar, foo, 'good/better/best', 'good/better', 'good'];
  const time = new Date(0); // Unix epoch Jan 1, 1970

  const hashes = [
      `37b51d194a7513e45b56f6524f2d51f2  ${foo}`,
      `acbd18db4cc2f85cedef654fccc4a4d8  ${bar}`,
  ]

  stats = {valid: hashes.length, invalid: 0, missing: 0}

  fs.mkdirSync(path.join('good', 'better', 'best'), { recursive: true });
  fs.writeFileSync(foo, 'bar');
  fs.writeFileSync(bar, 'foo');

  if (object.MD5SUMS) {
    fs.writeFileSync(path.join('good', 'MD5SUMS'), hashes.join('\n'));
  }

  /* touch MUST be last to ensure mtime of dirs do not change! */
  for (const path of paths) {
    fs.utimesSync(path, time, time);
  }

  return [hashes, stats, paths, time];
}

exports.setupBadDirectory = function (object) {
  [hashes, stats] = exports.setupGoodDirectory({MD5SUMS: true});

  fs.writeFileSync(path.join('good', 'better', 'best', 'foo'), 'rab');
  fs.unlinkSync(path.join('good', 'bar'));

  stats.invalid += 1;
  stats.missing += 1;
  stats.valid -= 2;

  return [hashes, stats];
}
