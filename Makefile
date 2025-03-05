.PHONY: lint setup-lint

lint:
	pre-commit run --all-files

setup-lint:
	pip install pre-commit
	pre-commit install
