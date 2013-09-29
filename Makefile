
test: lint test-only

test-only:
	@./node_modules/.bin/mocha -R spec

tolint := *.js *.json lib

lint:
	@./node_modules/.bin/jshint --verbose $(tolint)

.PHONY: test lint
