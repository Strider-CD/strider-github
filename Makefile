
test: lint
	@./node_modules/.bin/mocha -R spec

tolint := *.js *.json lib static

lint:
	@./node_modules/.bin/jshint --verbose $(tolint)

.PHONY: test lint
