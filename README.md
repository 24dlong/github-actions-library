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
uses: 24dlong/github-actions-library/actions/javascript/quality-gate@v4
```

#### Expo Quality Gate
Runs the base JavaScript quality gate, then checks Expo package compatibility and runs
Expo Doctor.

Requires the same Makefile commands and AWS inputs as the base Quality Gate action.

```yaml
uses: 24dlong/github-actions-library/actions/javascript/expo/quality-gate@v4
```

### Publish
Executes the quality gate action and executes a publish command if checks pass.
```yaml
uses: 24dlong/github-actions-library/actions/javascript/publish@v4
with:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

In addition to the Makefile requirements for the Quality Gate action, a `make publish`
command must also be implemented. This command should use the tool of your choice to
create a GitHub release and version tag.

### Library Publish
Runs quality checks and publishes a JavaScript library to AWS CodeArtifact.
```yaml
uses: 24dlong/github-actions-library/actions/javascript/library/publish@v4
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

### Generic Actions
#### Quality Gate
Checks out the repository and runs lint checks. Not specific to any language or technology.

```yaml
uses: 24dlong/github-actions-library/actions/quality-gate@v4
```

Requires a Makefile with the following commands implemented:

- `make setup-env`: Installs any tools required (e.g. pre-commit, checkov) and any hooks needed to run them.
- `make lint`: Runs all lint/static checks (e.g. `pre-commit run --all-files`).

Optionally, will run the following if they exist:
- `make test`: Runs any tests in the repository

The calling workflow is responsible for installing any language or tool runtime needed by
`make lint` (e.g. `actions/setup-python`, `hashicorp/setup-terraform`) before calling this
action.

#### Publish
Checks out the repository with full history (`fetch-depth: 0`), bumps the project
version with commitizen, and updates the major version tag pointer (e.g. `v1`, `v2`)
to point at the latest release. Intended to run on push to `main`. Not specific to any
language or technology. All steps are skipped when triggered by its own version-bump
commit (any commit message starting with `bump:`), to avoid retriggering itself.

```yaml
uses: 24dlong/github-actions-library/actions/publish@v4
with:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The token must be able to bypass branch protection on the target branch (e.g. a
personal access token or GitHub App installation token).

### Actions for Terraform Repositories
#### Terraform Plan
Runs `terraform plan` for a given root module, comments the rendered plan on the pull
request, and uploads the plan as a build artifact keyed by PR number and head SHA so a
later apply run can reuse the exact same plan. Intended to run on `pull_request`.

```yaml
uses: 24dlong/github-actions-library/actions/terraform/plan@v4
with:
  working-directory: production
  aws-role-to-assume: ${{ vars.AWS_ROLE_ARN_PLAN }}
  aws-region: us-east-2
  github-token: ${{ secrets.GITHUB_TOKEN }}
```

#### Terraform Apply
Resolves the pull request merged into the triggering commit, finds the matching
successful plan workflow run, downloads its saved plan artifact, and applies it as-is.
Intended to run on push to `main`.

```yaml
uses: 24dlong/github-actions-library/actions/terraform/apply@v4
with:
  working-directory: production
  aws-role-to-assume: ${{ vars.AWS_ROLE_ARN_APPLY }}
  aws-region: us-east-2
  github-token: ${{ secrets.GITHUB_TOKEN }}
  plan-workflow-file: pull-request.yml
```

`plan-workflow-file` must match the file name (under `.github/workflows/`) of the
workflow that ran the Terraform Plan action for pull requests, so the apply action can
look up its completed runs via the GitHub API.

## Contributing

### Initial Setup
Run `make setup-env` after cloning the repository.

### Requirements
Contributions must conform to (conventional-commit)[http://conventionalcommits.org] standards.

### Helpful Commands

`make setup-env`: to install `pre-commit` and any neccesary plugins
`make lint`: to run linting tools

### Technologies
This repository uses:
- **GitHub Actions** - No suprise here. The library contains it's own workflows, to run quality
checks on Pull Requests and publish new versions whenever key changes are pushed to the `main`
branch.
- **Makefile** - To minimize necessary knowledge of the repository's tools, all necessary
commands are implemented in a `Makefile`
- **Pre-commit & commitizen** - Ensures code quality before commits are made. Requires a one-time install by running `make setup-env`
