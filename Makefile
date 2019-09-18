
.PHONY: build



build: typescript bundle
	

typescript:
	node_modules/.bin/tsc

bundle:
	node_modules/.bin/rollup -c