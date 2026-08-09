.PHONY: lint setup-env setup-lint

lint:
	pre-commit run --all-files

setup-env:
	pip install pre-commit
	pre-commit install

setup-lint:
	make setup-env
