* Upgrade dev dependencies?

  First remove `devDependencies` from `package.json`. Add them back with the
  following command:

  `$ npm install --save-dev jest tmp`

* Install ndb debugger

  $ npm install -g ndb

* Run jest tests with debugger

  $ ndb $(npm bin)/jest --watch --no-cache --runInBand

  or

  $ make debug

* Run single jest test by name

  $ $(npm bin)/jest -t 'fail on nonexistent MD5SUM & return 1 w/fatal set to true'
