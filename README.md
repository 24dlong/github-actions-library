# GitHub Actions Library

A collection of reusable GitHub Actions for various technologies, designed for reusability.

Contributing a workflow, action, input or check? Read [ARCHITECTURE.md](ARCHITECTURE.md)
first. It explains the hub-and-spoke design, when to use an action vs a reusable workflow,
naming conventions, and why check names are a contract with branch protection.

## Migrating from v6 to v7

v7 turns each standard pipeline into a reusable workflow, so a repository keeps only its
triggers, permissions and repository-specific inputs. Adding a check or swapping a
technology becomes a change in this repository only.

- **Workflows and actions were renamed or removed.** Update the `uses:` path in your
  caller workflow. Inputs, secrets and behavior are unchanged, except for the check names
  below.

  | v6 | v7 |
  | --- | --- |
  | `.github/workflows/terraform-deploy.yml` | `.github/workflows/deploy.yml` |
  | `.github/workflows/terraform-destroy.yml` | `.github/workflows/destroy.yml` |
  | `.github/workflows/nextjs-publish.yml` | `.github/workflows/javascript-application-publish.yml` |
  | `.github/workflows/nextjs-pull-request.yml` | `.github/workflows/javascript-pull-request.yml` (same `expo-working-directory` input) |
  | `actions/nextjs/publish` | `actions/application/publish` |
  | `actions/nextjs/quality-gate` | `actions/javascript/quality-gate` |

- **Check names changed.** The reusable pull request workflows name their jobs `Core`,
  `Expo` and `Visual Tests`. Set `name: Quality Gate` on the caller job so every stack
  reports the same checks, and update branch protection or rulesets:

  | v6 check | v7 check |
  | --- | --- |
  | `Quality Gate \| Core` | `Quality Gate / Core` |
  | `Quality Gate \| Expo` | `Quality Gate / Expo` |
  | `Quality Gate \| Visual Tests` | `Quality Gate / Visual Tests` |
  | `quality-gate / Quality Gate \| Core` (from `nextjs-pull-request.yml`) | `Quality Gate / Core` |
  | `quality-gate / Quality Gate \| Expo` (from `nextjs-pull-request.yml`) | `Quality Gate / Expo` |

  A caller whose job is not named `Quality Gate` reports a different check and stays
  blocked on the required one, so rename the job in the same change that updates the
  ruleset.
- **New reusable workflows** replace per-repository job definitions. The composite
  actions are unchanged and remain available.

  | If your workflow runs | Use instead |
  | --- | --- |
  | `actions/quality-gate` | `pull-request.yml` |
  | `actions/publish` | `publish.yml` |
  | `actions/publish`, then `actions/terraform/deployment-pr` | `release.yml` |
  | `actions/javascript/quality-gate` (plus `expo/quality-gate`, `visual-tests`) | `javascript-pull-request.yml` |
  | `actions/javascript/publish` or `library/publish` (plus `visual-tests`) | `javascript-publish.yml` |

  `actions/javascript/library/publish` is a thin wrapper around `publish`, so
  `javascript-publish.yml` covers both. In `javascript-publish.yml`, `Visual Tests` gates
  the release; callers that ran `visual-tests` in parallel with `publish` now get a
  release that waits for it.
- `javascript-application-publish.yml` (was `nextjs-publish.yml`) now runs its release
  through `javascript-publish.yml`. Only the `uses:` path changes for callers.

## Required status checks

A job that runs through a reusable workflow is reported as
`<caller job name> / <job name in the reusable workflow>`. The workflow name and the
event shown in the GitHub UI are not part of the check name. Every pull request workflow
here names its jobs `Core`, `Expo` and `Visual Tests`, and callers name their job
`Quality Gate`, so the required checks are the same for every stack:

| Check | Reported when |
| --- | --- |
| `Quality Gate / Core` | always |
| `Quality Gate / Expo` | `javascript-pull-request.yml` with `expo-working-directory` set |
| `Quality Gate / Visual Tests` | `javascript-pull-request.yml` with `visual-tests: true` |

```yaml
jobs:
  quality-gate:
    name: Quality Gate # required: it is part of the check name
    permissions:
      contents: read
    uses: 24dlong/github-actions-library/.github/workflows/pull-request.yml@v7
```

Require `Quality Gate / Core` everywhere, and add `Expo` and `Visual Tests` for
repositories that run them.

## Migrating from v5 to v6

- **All action inputs are kebab-case.** AWS inputs are prefixed with the service they
  configure, because CodeArtifact and ECR can live in different AWS accounts:

  | v5 input | v6 input |
  | --- | --- |
  | `AWS_ACCOUNT_ID` | `codeartifact-aws-account-id` |
  | `AWS_REGION` | `codeartifact-aws-region` |
  | `AWS_ROLE_TO_ASSUME` | `codeartifact-aws-role-to-assume` |
  | `AWS_CODE_ARTIFACT_DOMAIN` | `codeartifact-domain` |
  | `AWS_CODE_ARTIFACT_REPOSITORY` | `codeartifact-repository` |
  | `REGISTRY_NAMESPACE` | `codeartifact-registry-namespace` |
  | `GITHUB_TOKEN` (javascript/publish, library/publish, commit) | `github-token` |
  | `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_SLUG` | `github-app-client-id`, `github-app-private-key`, `github-app-slug` |
  | `GITHUB_WORKFLOWS_CLIENT_ID`, `GITHUB_WORKFLOWS_PRIVATE_KEY` (publish) | `github-app-client-id`, `github-app-private-key` |
  | `CHROMATIC_PROJECT_TOKEN` | `chromatic-project-token` |
  | `STORYBOOK_TARGET`, `AUTOMATION_BRANCH`, `BASE_BRANCH` | `storybook-target`, `automation-branch`, `base-branch` |
  | `BRANCH`, `COMMIT_MESSAGE` (commit) | `branch`, `commit-message` |
  | `aws-role-to-assume`, `aws-region` (docker/publish) | `ecr-aws-role-to-assume`, `ecr-aws-region` (optional, defaults to the region in `ecr-repository-uri`) |

  Environment variables exported to `make` (`AWS_ACCOUNT_ID`, `AWS_CODE_ARTIFACT_*`,
  `REGISTRY_NAMESPACE`, `GITHUB_TOKEN`) keep their names.
- `actions/javascript/expo/quality-gate` no longer runs the base JavaScript Quality Gate.
  Run `actions/javascript/quality-gate` and `actions/javascript/expo/quality-gate` as
  separate jobs. Use `working-directory` when the Expo app isn't at the repository root.
- `actions/terraform/tfvars-bump-pr` now defaults `variable` to `image_tag` (was
  `image_uri`).
- The JavaScript setup actions now export `CODEARTIFACT_AUTH_TOKEN`, `AWS_ACCOUNT_ID`,
  `AWS_CODE_ARTIFACT_DOMAIN`, `AWS_CODE_ARTIFACT_REPOSITORY` and `REGISTRY_NAMESPACE` to
  the job environment. Registry auth scripts that already call `aws codeartifact login`
  keep working.
- New: `actions/aws/codeartifact-token`, `actions/nextjs/*`, and the
  `nextjs-pull-request.yml` / `nextjs-publish.yml` reusable workflows.
  `actions/docker/publish` gains optional CodeArtifact inputs and an `image-tag` output.
  `actions/javascript/publish` gains `released` and `version` outputs.

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
uses: 24dlong/github-actions-library/actions/javascript/quality-gate@v7
with:
  codeartifact-aws-account-id: ${{ vars.AWS_CODE_ARTIFACT_ACCOUNT_ID }}
  codeartifact-aws-region: ${{ vars.AWS_REGION }}
  codeartifact-aws-role-to-assume: ${{ vars.AWS_ROLE_TO_ASSUME }}
  codeartifact-domain: ${{ vars.AWS_CODE_ARTIFACT_DOMAIN }}
  codeartifact-repository: ${{ vars.AWS_CODE_ARTIFACT_REPOSITORY }}
  codeartifact-registry-namespace: ${{ vars.REGISTRY_NAMESPACE }}
```

Every JavaScript action takes these six `codeartifact-*` inputs; they are omitted from
the examples below.

#### Expo Quality Gate
Runs Expo-specific checks (currently Expo Doctor) for the Expo project in
`working-directory`. It checks out and installs dependencies itself and does **not** run
the base Quality Gate, so run it as a separate job next to it.

Requires `make setup-env` and `make install`.

```yaml
uses: 24dlong/github-actions-library/actions/javascript/expo/quality-gate@v7
with:
  working-directory: apps/mobile # optional, default .
```

### Publish
Executes the quality gate action and executes a publish command if checks pass.
```yaml
uses: 24dlong/github-actions-library/actions/javascript/publish@v7
with:
  github-token: ${{ secrets.GITHUB_TOKEN }}
```

In addition to the Makefile requirements for the Quality Gate action, a `make publish`
command must also be implemented. This command should use the tool of your choice to
create a GitHub release and a `v<semver>` tag (e.g. semantic-release).

Outputs `released` (`'true'` when `make publish` created a new `v*` tag on `HEAD`) and
`version` (that tag without the leading `v`). Check out with `fetch-depth: 0` first.

### Library Publish
Runs quality checks and publishes a JavaScript library to AWS CodeArtifact. A thin wrapper
around Publish with the same inputs and outputs.
```yaml
uses: 24dlong/github-actions-library/actions/javascript/library/publish@v7
with:
  github-token: ${{ secrets.GITHUB_TOKEN }}
```

In addition to the Makefile requirements for the Quality Gate action, a `make publish`
command must also be implemented. In the case of the `library/publish` action, this
command should also publish the library to CodeArtifact. The action handles authentication.

### JavaScript Reusable Workflows
Callers keep their triggers, permissions and inputs; the jobs live here. Both workflows
read the six CodeArtifact repository variables (`AWS_CODE_ARTIFACT_ACCOUNT_ID`,
`AWS_REGION`, `AWS_ROLE_TO_ASSUME`, `AWS_CODE_ARTIFACT_DOMAIN`,
`AWS_CODE_ARTIFACT_REPOSITORY`, `REGISTRY_NAMESPACE`) from the calling repository.

#### JavaScript Pull Request
Runs `Core` (the JavaScript Quality Gate), plus `Expo` when `expo-working-directory` is
set and `Visual Tests` when `visual-tests` is true. Name the caller job
`Quality Gate` (see Required status checks).

```yaml
# .github/workflows/pull-request.yml
on:
  pull_request:
    branches: [main]

jobs:
  quality-gate:
    name: Quality Gate
    permissions:
      id-token: write
      contents: read
    uses: 24dlong/github-actions-library/.github/workflows/javascript-pull-request.yml@v7
    with:
      expo-working-directory: apps/mobile # optional, runs Quality Gate / Expo
      visual-tests: true # optional, runs Quality Gate / Visual Tests
    secrets:
      chromatic-project-token: ${{ secrets.CHROMATIC_PROJECT_TOKEN }} # with visual-tests
```

`Visual Tests` runs the Storybook doctors (`pnpm doctor:storybook:web`,
`pnpm doctor:storybook:native`), builds the iOS Storybook (`pnpm build-storybook:ios`) and
runs Chromatic.

#### JavaScript Publish
Runs `Release` (the JavaScript Publish action: quality gate, then `make publish`). When
`visual-tests` is true, `Visual Tests` runs first and gates the release: if it fails,
nothing is released. Chromatic accepts changes on the default branch. Outputs `released`
and `version`.

```yaml
# .github/workflows/merge.yml
on:
  push:
    branches: [main]

jobs:
  publish:
    permissions:
      contents: write
      issues: write
      pull-requests: write
      id-token: write
    uses: 24dlong/github-actions-library/.github/workflows/javascript-publish.yml@v7
    with:
      visual-tests: true # optional
    secrets:
      chromatic-project-token: ${{ secrets.CHROMATIC_PROJECT_TOKEN }} # with visual-tests
```

### CodeArtifact Authentication
The JavaScript setup actions (and therefore every JavaScript action above) assume
`codeartifact-aws-role-to-assume` and export these variables to the job environment:
`CODEARTIFACT_AUTH_TOKEN`, `AWS_ACCOUNT_ID`, `AWS_CODE_ARTIFACT_DOMAIN`,
`AWS_CODE_ARTIFACT_REPOSITORY`, `REGISTRY_NAMESPACE`, and (from the credentials step)
`AWS_REGION`. The consumer's registry auth script (run by `make install`) should configure
npm from `CODEARTIFACT_AUTH_TOKEN` when it is set, and fall back to
`aws codeartifact login` locally. The AWS credentials stay in the job environment for
later steps.

To fetch a token directly:

```yaml
- uses: 24dlong/github-actions-library/actions/aws/codeartifact-token@v7
  id: codeartifact
  with:
    codeartifact-aws-account-id: ${{ vars.AWS_CODE_ARTIFACT_ACCOUNT_ID }}
    codeartifact-aws-region: ${{ vars.AWS_REGION }}
    codeartifact-aws-role-to-assume: ${{ vars.AWS_ROLE_TO_ASSUME }}
    codeartifact-domain: ${{ vars.AWS_CODE_ARTIFACT_DOMAIN }}
# ${{ steps.codeartifact.outputs.token }} is masked in logs
```

### JavaScript Application Repositories
JavaScript application repositories (for example a Next.js app deployed as a container
image) keep no pipeline logic of their own. Pull requests use the JavaScript Pull Request
workflow (`javascript-pull-request.yml`, with `expo-working-directory` for monorepos that
also contain an Expo app); merges use the JavaScript Application Publish workflow below.
Step logic lives in the composite actions the workflows call.

- `actions/application/publish`: pushes the container image tagged with a released version
  (Publish Image to ECR, with CodeArtifact auth), then opens an `image_tag` bump pull
  request in the infra repository (Terraform tfvars Bump Pull Request). It takes the
  released `version` as an input and contains nothing JavaScript-specific.

Both workflows read these caller repository (or GitHub Environment) variables:

| Variable | Used by | Purpose |
| --- | --- | --- |
| `AWS_CODE_ARTIFACT_ACCOUNT_ID`, `AWS_REGION`, `AWS_ROLE_TO_ASSUME`, `AWS_CODE_ARTIFACT_DOMAIN`, `AWS_CODE_ARTIFACT_REPOSITORY`, `REGISTRY_NAMESPACE` | both | CodeArtifact only: installs and the Docker build's private packages |
| `ECR_REPOSITORY_URI`, `AWS_ROLE_ARN_ECR_PUSH` | publish | ECR only: image push. The URI's account and region can differ from CodeArtifact's. |
| `INFRA_REPOSITORY_OWNER`, `INFRA_REPOSITORY_NAME`, `GH_WORKFLOWS_APP_CLIENT_ID` | publish | `image_tag` bump pull request |

#### JavaScript Application Publish
The `release` job runs JavaScript Publish (quality gate, then `make publish`). If that cut
a new version, the `publish` job runs `actions/application/publish` on an arm64 runner in
the `production` GitHub Environment, tagging the image with the version (no leading `v`).
A different language needs its own variant that releases through its own workflow, because
a workflow path can't be chosen by an input.

```yaml
# .github/workflows/merge.yml
on:
  push:
    branches: [main]

concurrency:
  group: publish
  cancel-in-progress: false

jobs:
  publish:
    permissions:
      contents: write
      issues: write
      pull-requests: write
      id-token: write
    uses: 24dlong/github-actions-library/.github/workflows/javascript-application-publish.yml@v7
    with:
      dockerfile: apps/web/Dockerfile
      build-args: | # optional, extra build args
        SENTRY_DSN=${{ vars.SENTRY_DSN }}
      # context, platform, runs-on and environment are optional
    secrets:
      github-app-private-key: ${{ secrets.GH_WORKFLOWS_APP_PRIVATE_KEY }}
```

The CodeArtifact role and the ECR push role must both trust the
`repo:<owner>/<repo>:environment:<environment>` OIDC subject for the `publish` job.

### Generic Actions
#### Quality Gate
Checks out the repository and runs lint checks. Not specific to any language or technology.

```yaml
uses: 24dlong/github-actions-library/actions/quality-gate@v7
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
uses: 24dlong/github-actions-library/actions/publish@v7
with:
  github-app-client-id: ${{ vars.GH_WORKFLOWS_APP_CLIENT_ID }}
  github-app-private-key: ${{ secrets.GH_WORKFLOWS_APP_PRIVATE_KEY }}
```

The GitHub App must be able to bypass branch protection on the target branch, push
commits, and create tags.

#### Pull Request and Publish Workflows
Reusable workflows wrapping the two actions above, for any repository whose checks run
through make. They install no language runtime: install tools in `make setup-env` (for
example with `mise`).

`pull-request.yml` runs one job, `Core`. Name the caller job `Quality Gate`.

```yaml
# .github/workflows/pull-request.yml
on:
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  quality-gate:
    name: Quality Gate # required: it is part of the check name
    permissions:
      contents: read
    uses: 24dlong/github-actions-library/.github/workflows/pull-request.yml@v7
```

`publish.yml` bumps the version and outputs `version` (empty when nothing was released).
The caller job needs `contents: write`.

```yaml
# .github/workflows/merge.yml
on:
  push:
    branches: [main]

jobs:
  publish:
    permissions:
      contents: write
    uses: 24dlong/github-actions-library/.github/workflows/publish.yml@v7
    with:
      github-app-client-id: ${{ vars.GH_WORKFLOWS_APP_CLIENT_ID }}
    secrets:
      github-app-private-key: ${{ secrets.GH_WORKFLOWS_APP_PRIVATE_KEY }}
```

### Actions for Container Images
#### Publish Image to ECR
Builds a single-platform image with Docker Buildx and pushes it to Amazon ECR using
GitHub OIDC. Outputs the pushed `image-tag`, its `digest`, and a digest-pinned
`image-uri` (`<repository>@sha256:...`). With an immutable-tag ECR repository, deploy by
`image-tag` (a release version); re-publishing an existing tag fails at push.

```yaml
- uses: 24dlong/github-actions-library/actions/docker/publish@v7
  id: publish
  with:
    # ECR: where the image is pushed
    ecr-repository-uri: ${{ vars.ECR_REPOSITORY_URI }}
    ecr-aws-role-to-assume: ${{ vars.AWS_ROLE_ARN_ECR_PUSH }}
    ecr-aws-region: us-east-2 # optional, default is the region in ecr-repository-uri
    dockerfile: apps/web/Dockerfile
    context: .
    platform: linux/arm64 # optional, default linux/arm64
    image-tag: 1.2.3 # optional, default github.sha
    secrets: | # optional
      other_secret=${{ steps.other.outputs.value }}
    # CodeArtifact (optional): where the build installs private packages from
    codeartifact-domain: ${{ vars.AWS_CODE_ARTIFACT_DOMAIN }}
    codeartifact-aws-account-id: ${{ vars.AWS_CODE_ARTIFACT_ACCOUNT_ID }}
    codeartifact-aws-region: ${{ vars.AWS_REGION }}
    codeartifact-aws-role-to-assume: ${{ vars.AWS_ROLE_TO_ASSUME }}
    codeartifact-repository: ${{ vars.AWS_CODE_ARTIFACT_REPOSITORY }}
    codeartifact-registry-namespace: ${{ vars.REGISTRY_NAMESPACE }}
```

ECR and CodeArtifact are configured independently, so they can be in different AWS
accounts and regions. The `ecr-*` inputs are only used to push the image; the
`codeartifact-*` inputs are only used to fetch a token for the build.

When `codeartifact-domain` is set, the other `codeartifact-*` inputs are required. The
action fetches a CodeArtifact token and adds it to the build as the `codeartifact_token`
BuildKit secret. It also passes the CodeArtifact values as the build args `AWS_REGION`,
`AWS_ACCOUNT_ID`, `AWS_CODE_ARTIFACT_DOMAIN`, `AWS_CODE_ARTIFACT_REPOSITORY` and
`REGISTRY_NAMESPACE`. Consume them in the Dockerfile with
`RUN --mount=type=secret,id=codeartifact_token,env=CODEARTIFACT_AUTH_TOKEN ...`.

The calling job needs `permissions: id-token: write`. The image is pushed without
provenance/SBOM attestations because AWS Lambda rejects the resulting OCI image index;
this also means `platform` must be a single platform. Build `linux/arm64` images on an
arm64 runner (e.g. `ubuntu-24.04-arm`) to avoid slow QEMU emulation. Layer cache uses the
GitHub Actions cache (`type=gha`).

`secrets` are BuildKit secrets (`id=value` per line), consumed in the Dockerfile with
`RUN --mount=type=secret,id=<id>`; they are never written to image layers. Mask any
value you generate in an earlier step with `::add-mask::`.

The role needs `ecr:GetAuthorizationToken` plus, scoped to the repository,
`ecr:BatchCheckLayerAvailability`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`,
`ecr:CompleteLayerUpload`, `ecr:PutImage`, and `ecr:BatchGetImage`.

### Actions for Terraform Repositories
#### Terraform Plan
Runs `terraform plan` for a given root module, comments the rendered plan on the pull
request (headed `Terraform plan for <environment>`), and uploads the plan as a build
artifact keyed by PR number and head SHA so a later apply run can reuse the exact
same plan. Intended to run on `pull_request`.

```yaml
uses: 24dlong/github-actions-library/actions/terraform/plan@v7
with:
  working-directory: infra
  environment: production
  aws-role-to-assume: ${{ vars.AWS_ROLE_ARN_PLAN }}
  aws-region: us-east-2
  github-token: ${{ secrets.GITHUB_TOKEN }}
  ref: ${{ needs.changes.outputs.production-ref }} # optional
  var-file: environments/production/terraform.tfvars # optional
```

`ref` is a git branch, tag, or SHA to check out before planning. Omit it to use the
triggering event's ref (the default). For GitOps deploys driven by
`environments/<env>/deployed.json`, pass the **pinned sha** from that file, not a
moving branch name like `main`.

`var-file` is passed straight through as `-var-file`. Omit it to plan with only
`variables.tf` defaults. Terraform variable overrides belong in a git-tracked
`.tfvars` file (reviewable in the plan output itself) rather than as GitHub
Environment variables -- see the Terraform GitOps Deploy section below for why
backend/role configuration is treated differently.

#### Terraform Apply
Resolves the pull request merged into the triggering commit, finds the matching
successful plan workflow run, downloads its saved plan artifact, and applies it as-is.
Intended to run on push to `main`.

```yaml
uses: 24dlong/github-actions-library/actions/terraform/apply@v7
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
uses: 24dlong/github-actions-library/actions/terraform/deployment-pr@v7
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

#### Terraform tfvars Bump Pull Request
Opens (or reuses) a pull request in a Terraform GitOps repository that sets one string
variable in `environments/<environment>/terraform.tfvars` — typically `image_tag` after
an application repository publishes a new container image. The target repository can
live in a different org than the caller. Idempotent: if the variable already has the
requested value, no branch or pull request is created.

```yaml
uses: 24dlong/github-actions-library/actions/terraform/tfvars-bump-pr@v7
with:
  owner: my-org # optional, default is the calling repository's owner
  repository: frontend-infra
  environment: production
  variable: image_tag # optional, default image_tag
  value: ${{ needs.publish.outputs.image-tag }}
  github-app-client-id: ${{ vars.GH_WORKFLOWS_APP_CLIENT_ID }}
  github-app-private-key: ${{ secrets.GH_WORKFLOWS_APP_PRIVATE_KEY }}
```

The GitHub App must be installed on the target repository with contents and pull request
write permissions. The action only rewrites the text after `=` on the matching line (so
`terraform fmt` alignment is kept) and appends the variable if it is absent; it fails if
the tfvars file does not exist. The target is checked out into `.tfvars-bump-target/`, so
the caller's workspace is untouched.

Merging the pull request only changes tfvars. Deploying it still goes through the target
repository's own GitOps trigger (`environments/<env>/deployed.json`), so that repository's
merge workflow must request a deployment when tfvars change. The commit and pull request
title are `chore(deploy): bump <environment> <variable>` so that a squash merge still
produces a conventional commit that the infra repository's version bump picks up (which
in turn opens the deployment pull request).

#### Release
Reusable workflow (`release.yml`) for Terraform GitOps repositories. It runs Publish
(`publish.yml`, job `Create Version`) and, when a version was created, Terraform
Deployment Pull Request (job `Request Deployment`) for `environment` (default
`production`) against `base-branch` (default `main`). Planning and applying then happen in
the repository's Deploy workflows. The caller job needs `contents: write` and
`pull-requests: write`. Outputs `version`.

```yaml
# .github/workflows/merge.yml
on:
  push:
    branches: [main]
    paths:
      - infra/**

jobs:
  release:
    permissions:
      contents: write
      pull-requests: write
    uses: 24dlong/github-actions-library/.github/workflows/release.yml@v7
    with:
      github-app-client-id: ${{ vars.GH_WORKFLOWS_APP_CLIENT_ID }}
      environment: production # optional
    secrets:
      github-app-private-key: ${{ secrets.GH_WORKFLOWS_APP_PRIVATE_KEY }}
```

#### Terraform GitOps Deploy
Reusable workflow (`deploy.yml`) that detects which `environments/<env>/deployed.json` files
changed, then fans out one job per environment. Each job sets
`environment: <env>` so that GitHub Environment variables and required
reviewers apply, then runs Terraform Plan (on pull request) or Terraform Apply
(on merge) against the **pinned sha** from that file.

This is the recommended way to wire plan/apply in an infra repo. Composite
actions cannot own this graph: they cannot declare jobs, a matrix, or
`environment:`.

The consuming repo keeps a thin wrapper for the trigger only. Adding an
environment is `environments/<env>/` (two git files) plus a GitHub
Environment named `<env>` (five variables) — no workflow copy-paste.

Required layout, split by whether a value shows up in the `terraform plan`
diff before it takes effect (safe as a PR-reviewable git file) or takes
effect before any plan exists, such as which state file gets written or
which AWS identity CI assumes (needs the admin-gated bar of a GitHub
Environment variable):

- `environments/<env>/deployed.json` with a `sha` field (directory name **is**
  the GitHub Environment name) — the GitOps trigger.
- `environments/<env>/terraform.tfvars` — Terraform variable overrides for
  that environment (e.g. `environment`, resource naming, tags). Passed to
  Terraform Plan automatically as `-var-file`. Terraform Apply does not need
  it: it replays the saved binary plan, which already encodes the values
  used to produce it.
- GitHub Environment `<env>` variables: `AWS_ROLE_ARN_PLAN`,
  `AWS_ROLE_ARN_APPLY`, `STATE_BUCKET`, `STATE_KEY`, `STATE_REGION`. These
  control where this environment's Terraform state is written and what AWS
  identity CI assumes -- both resolved before any plan is generated, so a
  git file would let any approved PR silently redirect them with no
  plan-diff visible for review. Keeping them here means changing them
  requires GitHub Environment/repo admin access, not just a PR approval.

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
    uses: 24dlong/github-actions-library/.github/workflows/deploy.yml@v7
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
    uses: 24dlong/github-actions-library/.github/workflows/deploy.yml@v7
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
above), not `deploy.yml`. Plan artifacts attach to the caller run,
and Terraform Apply looks up that run by workflow file name.

The caller must grant permissions on the `uses:` job; reusable workflows cannot
escalate them. That permission block does not grow with environment count.

#### Terraform Destroy
Reusable workflow (`destroy.yml`) that destroys **application** Terraform (`infra/`) after a
typed confirmation and a GitHub Environment approval. Composite actions
cannot own this graph: they cannot declare jobs or `environment:`.

Flow:

1. `confirm` — fail immediately unless `confirmation` equals
   `expected-confirmation` exactly. No AWS.
2. `plan-destroy` — `environment: <environment>` (e.g. `production`), assumes
   `vars.AWS_ROLE_ARN_PLAN`, runs `make plan` with `-destroy`, prints the
   plan, uploads a same-run artifact. Uses the same concurrency group as
   GitOps Deploy so plan/apply and destroy cannot overlap.
3. `destroy` — `environment: <environment>` (pass
   `destroy-<env>` so state and the destroy role match the Terraform
   environment; default is `destroy`). This job waits for required
   reviewers. Assumes `vars.AWS_ROLE_ARN_DESTROY` and runs
   `make apply PLAN_FILE=tfplan`.

The consuming repo keeps a thin `workflow_dispatch` wrapper. OIDC roles are
**not** destroyed here; they live in a separate Terraform root applied
locally.

Required GitHub Environment `destroy-<env>` (in addition to `<env>` used
for plan), e.g. `destroy-production`:

- Required reviewers (configure in the GitHub UI; cannot be set from repo files)
- Deployment branches restricted to `main` (recommended)
- Variables: `AWS_ROLE_ARN_DESTROY`, plus the same `STATE_BUCKET` /
  `STATE_KEY` / `STATE_REGION` as the Terraform environment being destroyed
  (a job can only use one GitHub Environment)

Do not put `AWS_ROLE_ARN_APPLY` on `destroy-<env>`, and do not put
`AWS_ROLE_ARN_DESTROY` on `<env>`. No AWS access keys.

The consumer Makefile must implement `make plan` (honors `TF_FLAGS` and
`ENV`) and `make apply` (honors `PLAN_FILE=tfplan` to replay a saved plan).
`make setup-env` is also required.

```yaml
# .github/workflows/terraform-destroy.yml
name: Destroy Application Infrastructure

on:
  workflow_dispatch:
    inputs:
      environment:
        description: Terraform environment to destroy (must match environments/<env>/)
        required: true
        type: string
        default: production
      confirmation:
        description: Type exactly DESTROY <project>/<environment>
        required: true
        type: string

permissions:
  contents: read

jobs:
  destroy:
    uses: 24dlong/github-actions-library/.github/workflows/destroy.yml@v7
    permissions:
      id-token: write
      contents: read
      actions: write
    with:
      working-directory: infra
      environment: ${{ inputs.environment }}
      confirmation: ${{ inputs.confirmation }}
      expected-confirmation: DESTROY example-app-infra/${{ inputs.environment }}
```

No GitHub App secrets. Caller must grant `id-token: write` (OIDC),
`contents: read`, and `actions: write` (plan artifact).

#### Terraform Plan Destroy / Apply Destroy
Composites used by the destroy reusable workflow. Prefer calling the
reusable workflow rather than these directly.

```yaml
- uses: 24dlong/github-actions-library/actions/terraform/plan-destroy@v7
  with:
    working-directory: infra
    environment: production
    aws-role-to-assume: ${{ vars.AWS_ROLE_ARN_PLAN }}
    aws-region: us-east-2

- uses: 24dlong/github-actions-library/actions/terraform/apply-destroy@v7
  with:
    working-directory: infra
    environment: production
    aws-role-to-assume: ${{ vars.AWS_ROLE_ARN_DESTROY }}
    aws-region: us-east-2
```

#### Detect Deploy Targets
Lists `environments/<env>/deployed.json` files changed in the triggering pull
request or push, reads each pinned `sha`, and emits a matrix JSON. Used by the
GitOps Deploy reusable workflow; also usable on its own if a repo needs a
custom job graph.

```yaml
- uses: 24dlong/github-actions-library/actions/terraform/detect-deploy-targets@v7
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
