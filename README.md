# GitHub Actions Library

A collection of reusable GitHub Actions for various technologies, designed for reusability.

## Usage

### Actions for Javascript Repositories
#### Quality Gate
Ensures code quality by running lint, test, and build steps. Can be run in a variety of
contexts, but most commonly on pull_request and on merge

Requires a Makefile with the following commands implemented:

- `make setup-env`: Used to install or setup any software required before installing dependencies, like corepack
- `make install`: Installs dependencies.
- `make lint`: Runs linting checks.
- `make test`: Executes tests, preferable a coverage check
- `make build`: Builds the project.

```yaml
uses: 24dlong/github-actions-library/actions/javascript/quality-gate@v2
```

### Publish
Executes the quality gate action and executes a publish command if checks pass.
```yaml
uses: 24dlong/github-actions-library/actions/javascript/publish@v2
with:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

In addition to the Makefile requirements for the Quality Gate action, a `make publish`
command must also be implemented. This command should use the tool of your choice to
create a GitHub release and version tag.

### Library Publish
Runs quality checks and publishes a JavaScript library to AWS CodeArtifact.
```yaml
uses: 24dlong/github-actions-library/actions/javascript/library/publish@v2
with:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  AWS_ACCOUNT_ID: "your-account-id"
  AWS_REGION: "your-region"
  AWS_ROLE_TO_ASSUME: "your-role"
  AWS_CODE_ARTIFACT_DOMAIN: "your-domain"
  AWS_CODE_ARTIFACT_REPOSITORY: "your-repository"
```

In addition to the Makefile requirements for the Quality Gate action, a `make publish`
command must also be implemented. In the case of the `library/publish` action, this
command should also publish the library to CodeArtifact. The action handles authentication.

## Contributing

### Initial Setup
Run `make setup-lint` after cloning the repository.

### Requirements
Contributions must conform to (conventional-commit)[http://conventionalcommits.org] standards.

### Helpful Commands

`make setup-lint`: to install `pre-commit` and any neccesary plugins
`make lint`: to run linting tools

### Technologies
This repository uses:
- **GitHub Actions** - No suprise here. The library contains it's own workflows, to run quality
checks on Pull Requests and publish new versions whenever key changes are pushed to the `main`
branch.
- **Makefile** - To minimize necessary knowledge of the repository's tools, all necessary
commands are implemented in a `Makefile`
- **Pre-commit & commitizen** - Ensures code quality before commits are made. Requires a one-time install by running `make setup-lint`
