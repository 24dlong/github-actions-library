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
  ref: ${{ needs.changes.outputs.production-ref }} # optional
```

`ref` is a git branch, tag, or SHA to check out before planning. Omit it to use the
triggering event's ref (the default). For GitOps deploys driven by
`environments/<env>/deployed.json`, pass the **pinned sha** from that file, not a
moving branch name like `main`.

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
  ref: ${{ needs.changes.outputs.production-ref }} # optional
```

`plan-workflow-file` must match the file name (under `.github/workflows/`) of the
workflow that ran the Terraform Plan action for pull requests, so the apply action can
look up its completed runs via the GitHub API.

`ref` has the same meaning as on the plan action. It only affects which tree is
checked out for Terraform; plan-artifact lookup still uses the triggering commit
(`GITHUB_SHA`).

#### Terraform Deployment Pull Request
Opens (or reuses) a pull request that bumps `environments/<environment>/deployed.json`
to a given ref/sha, requesting a deployment of that environment. Idempotent: if the
environment is already at that sha, no branch or pull request is created. Designed to
be called both for a repository's lowest environment on every merge to `main`, and
later by a promotion workflow for upper environments.

```yaml
uses: 24dlong/github-actions-library/actions/terraform/deployment-pr@v4
with:
  environment: production
  ref: ${{ github.sha }}
  github-token: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
  base-branch: main
```

The calling repository must have an `environments/<environment>/` directory (the
action creates `deployed.json` inside it if it doesn't exist yet). `github-token` must
be able to bypass branch protection on `base-branch` (e.g. a personal access token or
GitHub App installation token) so it can push the deployment branch and open the pull
request.

#### Terraform GitOps Deploy
Reusable workflow that detects which `environments/<env>/deployed.json` files
changed, then fans out one job per environment. Each job sets
`environment: <env>` so that GitHub Environment variables and required
reviewers apply, then runs Terraform Plan (on pull request) or Terraform Apply
(on merge) against the **pinned sha** from that file.

This is the recommended way to wire plan/apply in an infra repo. Composite
actions cannot own this graph: they cannot declare jobs, a matrix, or
`environment:`.

The consuming repo keeps a thin wrapper for the trigger only. Adding an
environment is `environments/<env>/deployed.json` plus a GitHub Environment
named `<env>` — no workflow copy-paste.

Required layout and GitHub Environment variables (per environment):

- `environments/<env>/deployed.json` with a `sha` field (directory name **is**
  the GitHub Environment name)
- `AWS_ROLE_ARN_PLAN`, `AWS_ROLE_ARN_APPLY`, `STATE_BUCKET`, `STATE_KEY`,
  `STATE_REGION`

```yaml
# .github/workflows/pull-request-deploy.yml
name: Deploy Plan Workflow

on:
  pull_request:
    branches:
      - main
    paths:
      - "environments/**/deployed.json"

permissions:
  contents: read

jobs:
  plan:
    uses: 24dlong/github-actions-library/.github/workflows/terraform-deploy.yml@v4
    permissions:
      id-token: write
      contents: read
      pull-requests: write
      actions: write
    secrets:
      github-token: ${{ secrets.GITHUB_TOKEN }}
    with:
      command: plan
      working-directory: infra
```

```yaml
# .github/workflows/merge-deploy.yml
name: Deploy Apply Workflow

on:
  push:
    branches:
      - main
    paths:
      - "environments/**/deployed.json"

permissions:
  contents: read

jobs:
  apply:
    uses: 24dlong/github-actions-library/.github/workflows/terraform-deploy.yml@v4
    permissions:
      id-token: write
      contents: read
      actions: read
      pull-requests: read
    secrets:
      github-token: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
    with:
      command: apply
      working-directory: infra
      plan-workflow-file: pull-request-deploy.yml
```

`plan-workflow-file` must be the **caller** workflow file name (the wrapper
above), not `terraform-deploy.yml`. Plan artifacts attach to the caller run,
and Terraform Apply looks up that run by workflow file name.

The caller must grant permissions on the `uses:` job; reusable workflows cannot
escalate them. That permission block does not grow with environment count.

#### Detect Deploy Targets
Lists `environments/<env>/deployed.json` files changed in the triggering pull
request or push, reads each pinned `sha`, and emits a matrix JSON. Used by the
GitOps Deploy reusable workflow; also usable on its own if a repo needs a
custom job graph.

```yaml
- uses: 24dlong/github-actions-library/actions/terraform/detect-deploy-targets@v4
  id: detect
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

Outputs:

- `matrix`: `{"include":[{"environment":"production","ref":"<sha>"},...]}` for
  `strategy.matrix`
- `any`: `true` if at least one environment file changed

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
