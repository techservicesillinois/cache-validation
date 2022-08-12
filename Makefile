.PHONY: all deps test clean clean-all

all: test

deps: node_modules

debug:
	ndb $(npm bin)/jest --watch --no-cache --runInBand

test: node_modules
	npm run test

package-lock.json: package.json
	npm install --include=dev
	@touch $@

node_modules: package-lock.json
	npm ci --include=dev
	@touch $@

clean:
	rm -rf node_modules coverage

clean-all: clean
	rm -f package-lock.json
