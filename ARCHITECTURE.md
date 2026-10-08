# Architecture

This document explains how this repository is organized and, more importantly, **why**.
Read it before adding a workflow, an action, an input or a check. The
[README](README.md) documents *how to use* each piece; this document documents *how to
decide* what belongs where.

## Contents

- [Philosophy: hub and spoke](#philosophy-hub-and-spoke)
- [The four layers](#the-four-layers)
- [Composite action vs reusable workflow](#composite-action-vs-reusable-workflow)
- [The Makefile contract](#the-makefile-contract)
- [New reusable workflow vs generic workflow plus `make`](#new-reusable-workflow-vs-generic-workflow-plus-make)
- [Optional checks: input vs new workflow](#optional-checks-input-vs-new-workflow)
- [DRY rationale](#dry-rationale)
- [Naming conventions](#naming-conventions)
- [Why names matter: required status checks](#why-names-matter-required-status-checks)
- [Versioning and releases](#versioning-and-releases)
- [Security and credentials](#security-and-credentials)
- [GitHub Actions constraints that shape the design](#github-actions-constraints-that-shape-the-design)
- [Checklists](#checklists)
- [Known gaps](#known-gaps)

## Philosophy: hub and spoke

This repository is the **hub**. Every other repository (a **spoke**) is a thin caller.

A spoke decides only what is genuinely local to it:

- **When** a pipeline runs (`on:` triggers, branches, path filters)
- **What it may touch** (`permissions:`, environments, which secrets it passes)
- **Repository-specific inputs** (the Expo app directory, whether it has visual tests)
- **How its own tools run**, expressed as `make` targets

The hub decides everything else:

- **Whether** a check exists (what runs on every pull request)
- **The job graph**: which jobs run, in what order, and what gates what
- **Check names**, which branch protection depends on
- **Platform plumbing**: OIDC, CodeArtifact, ECR, GitHub App tokens, caching, runners

The goal: **adding a check, changing a tool, or swapping a technology is a change in one
repository.** Spokes pick it up by tracking the major version tag, with no pull request
per repository.

A spoke workflow should usually look like this, and nothing more:

```yaml
jobs:
  quality-gate:
    name: Quality Gate
    permissions:
      contents: read
    uses: 24dlong/github-actions-library/.github/workflows/pull-request.yml@v7
```

If a spoke workflow grows real logic, that logic probably belongs here, or in the
spoke's `Makefile`.

## The four layers

```
Spoke repository
  ├─ Caller workflow      triggers, permissions, inputs         (when / who)
  │    └─ calls ─▶ Reusable workflow    jobs, order, check names (whether / shape)
  │                   └─ uses ─▶ Composite action   ordered steps (reusable steps)
  │                                  └─ runs ─▶ `make` targets   the repo's tools (how)
```

| Layer | Lives in | Owns | Does not own |
| --- | --- | --- | --- |
| Caller workflow | spoke `.github/workflows/` | Triggers, permissions, inputs, environment | Job graph, tooling |
| Reusable workflow | `.github/workflows/*.yml` (`workflow_call`) | Jobs, `needs`, runners, permissions per job, check names | Repository tools |
| Composite action | `actions/**/action.yml` | A reusable sequence of steps | Runners, permissions, job order |
| `make` target | spoke `Makefile` | The commands for lint, test, build, install | Anything GitHub-specific |

Dependencies point one way: callers use workflows, workflows use actions, actions run
`make`. An action never calls a workflow (GitHub does not allow it), and a workflow should
not reimplement what an action already does.

## Composite action vs reusable workflow

Both let you reuse automation. They are not interchangeable.

| | Composite action | Reusable workflow |
| --- | --- | --- |
| Unit of reuse | A list of **steps** | One or more **jobs** |
| Runs on | The caller job's runner and workspace | Its own runner(s), declared inside |
| Can set `runs-on`, `permissions`, `environment`, `needs`, `if` on a job, `strategy`, `concurrency` | No | Yes |
| Shares the caller's checked-out files | Yes | No: each job starts clean |
| Secrets | Only as inputs the caller passes | `secrets:` declared explicitly |
| Defines PR check names | No (it is a step inside a job) | Yes (each job is a check) |
| Can be called from | A step in any job | A job (`uses:` at job level) |
| Can be nested | Actions can use actions | Workflows can call workflows, within GitHub's depth limits |

**Use a composite action when** the thing is a *building block*: a sequence of steps that
is meaningful inside someone else's job. Examples: `actions/aws/codeartifact-token`
(get a token), `actions/javascript/setup` (set up and install), `actions/terraform/plan`.
Actions are the library's vocabulary. They are also the right unit when a caller needs to
embed the steps in a larger, custom job.

**Use a reusable workflow when** the thing is a *pipeline*: it has opinions about how many
jobs run, in what order, with which permissions, on which runner, and under which check
name. Examples: `pull-request.yml`, `release.yml`, `deploy.yml`.

Rules of thumb:

1. If you need a different `permissions:` block, a different `environment:`, a matrix, or
   job ordering (`needs`), it is a workflow.
2. If you need to *share files with the caller's job* (the checked-out workspace, the
   installed `node_modules`), it is an action.
3. If a reviewer should see the result as a named PR check, it is a **job** in a reusable
   workflow.
4. Put the *logic* in actions and the *shape* in workflows. A reusable workflow is mostly
   `uses:` lines plus the plumbing that only a job can do.

Both are kept: the composite actions are the stable low-level API, and the reusable
workflows are the standard pipelines built from them.

## The Makefile contract

Every spoke exposes a small, conventional interface and the hub calls it. This is what
lets one generic workflow serve many technologies.

| Target | Called by | Purpose |
| --- | --- | --- |
| `setup-env` | Generic quality gate, JavaScript setup, Terraform actions | Install the tools this repo needs (runtime versions, linters, pre-commit) |
| `install` | JavaScript setup | Install dependencies |
| `registry-auth` | JavaScript (via `install`, and the upgrade actions) | Authenticate to the package registry (CodeArtifact) using the token the setup action exports |
| `lint` | Generic and JavaScript quality gates | Static checks |
| `test` | Generic and JavaScript quality gates | Tests. **Optional in the generic gate** (skipped when the target is absent); required by the JavaScript gate |
| `build` | JavaScript quality gate | Verify the project builds |
| `publish` | `actions/javascript/publish` | Create the release. Receives `GITHUB_TOKEN`; the generic `publish.yml` uses commitizen instead and needs no target |
| `plan`, `apply` | Terraform actions | Plan and apply an environment (`ENV`, `INFRA_DIR`, `PLAN_FILE`, `TF_FLAGS`) |

Why `make`:

- **The repo owns *how*; the hub owns *whether*.** The hub guarantees lint runs on every
  pull request. The repo decides what "lint" means.
- **Local and CI behavior match.** A developer runs the same `make lint` the pipeline runs.
- **No workflow inputs for tooling.** A runtime version or an extra tool is a repo
  concern. Pin it where the repo already pins versions (`.tool-versions` with mise or asdf,
  `.nvmrc`, `packageManager`) and have `make setup-env` install it.

Keep the targets honest and lean:

- **`make install` runs in *every* job that sets up the project**, including jobs that
  don't need everything it does. A heavy step added to `install` (for example installing
  browser system packages) slows down every job and every check. Put extra setup in the
  target that needs it (`test`, for example), not in the shared one.
- Targets must be non-interactive and exit non-zero on failure.

## New reusable workflow vs generic workflow plus `make`

When a repository needs something different, decide with one question:

> Does the difference change **what the job needs from GitHub**, or only **what runs
> inside the shell**?

| The difference is... | Do this |
| --- | --- |
| A different language runtime, linter, formatter, or code generator | Generic workflow plus `make setup-env` / `make lint` |
| An extra lint or test command | Generic workflow plus `make lint` / `make test` |
| A tool version | `.tool-versions` / `.nvmrc`, installed by `make setup-env` |
| Different **permissions** (`id-token: write`, `packages: write`) | New workflow |
| Different **credentials** (CodeArtifact, ECR, GitHub App token, OIDC role) | New workflow (or stack-specific action) |
| Different **job graph** (a gate that must precede a release, a second job that needs the first's output) | New workflow |
| Different **runner** (arm64, larger runner) or **environment** (approval gates) | New workflow |
| Different **check names** that branch protection should require | New workflow, with a considered name |

Why: the generic workflows (`pull-request.yml`, `publish.yml`, `release.yml`, `deploy.yml`,
`destroy.yml`) are intentionally technology-agnostic. They run `make` and know nothing about
Python, Terraform or Node. Terraform repositories get their tools from mise, so the generic
pull request workflow already works for them. A `python-version` input was rejected for
exactly this reason: runtime versions are not the hub's business.

JavaScript is different **because its platform needs differ**, not because it is a
different language. It needs CodeArtifact authentication (`id-token: write`, six
repository variables), an optional Expo check, and an optional Chromatic check. Those are
GitHub-level needs, so it gets its own workflows, prefixed `javascript-`.

Two firm rules:

1. **Do not merge stacks into one mega-workflow.** There is no single `pull-request.yml`
   and `publish.yml` for every stack, and there never will be. The generic workflows stay
   generic. A stack with platform needs gets a stack-prefixed workflow.
2. **Do not grow a workflow with flags for every stack.** If you are about to add the
   third stack-specific boolean to a generic workflow, create a stack workflow instead.

Before creating a new workflow, check whether the real need is only a `make` target. Most
"we need a different workflow" requests are.

## Optional checks: input vs new workflow

Some checks only apply to some repositories (Expo, Visual Tests). We model them as
**optional jobs switched by an input**, not as separate workflows.

Use an **input** when all of these hold:

- The check is **additive**: it runs alongside the existing jobs and does not change them.
- It needs the **same permissions and credentials** as the existing jobs.
- It can be switched by a **non-secret input** (a boolean or a string).
- It produces a **stable, named check** that is simply skipped when off.

Create a **new workflow** when any of these hold:

- It changes **ordering or gating** of the existing jobs in a way callers cannot toggle.
- It needs **different permissions, runner, or environment**.
- Turning it on would require a **different set of inputs and secrets** altogether.
- The toggles are multiplying (flag soup). Two or three independent booleans is the limit
  before a workflow becomes hard to reason about.

Conventions for optional jobs:

- Switch on the input in the job `if:`:
  `if: inputs.expo-working-directory != ''` or `if: inputs.visual-tests`.
- **Use a boolean for the switch, not "was the secret passed".** The `secrets` context is
  not available in a job-level `if:`. A secret that is needed only when the check runs
  is declared `required: false` and documented as required when the flag is set.
- Prefer a **string input that doubles as configuration** when the check needs a value
  anyway (`expo-working-directory` both enables Expo and says where the app lives).
- The job keeps a fixed `name`. A skipped job shows up as a *skipped* check, which counts
  as passing for a required check. That is why the hub can list `Expo` and `Visual Tests`
  for everyone while only requiring them where they apply (see below).
- A job that is **optional but must gate a release** (Visual Tests gates `javascript-publish.yml`)
  needs a guard that does not treat "skipped" as failure:
  `if: ${{ !cancelled() && needs.visual-tests.result != 'failure' }}`.

## DRY rationale

Before v7, each repository defined its own quality-gate jobs. Seven-plus repositories
carried near-identical blocks (including six CodeArtifact `vars` lines per job), with
subtle drift in job names (`Quality Gate | Core`, `quality-gate / Quality Gate | Core`).
Every change meant a pull request per repository, and every naming difference meant a
special case in branch protection.

Centralizing buys:

- **One place to change a check or a technology.** Add a job to `javascript-pull-request.yml`,
  release, and every consumer has it.
- **Consistent check names**, so branch protection can be a single catch-all rule.
- **One place to fix platform bugs and upgrade platform dependencies** (action versions,
  CodeArtifact auth, runner images).
- **Smaller, more reviewable spokes.** The diff to a spoke is its intent, not its plumbing.

DRY has limits. Do **not** centralize:

- **Triggers and path filters.** They describe the repo's own change patterns.
- **Permissions.** A reusable workflow cannot elevate beyond what the caller grants, so
  callers must declare them. Declaring them is also good least-privilege hygiene.
- **Repository-specific commands.** Those are `make` targets.
- **Something used once.** Extract when at least two repositories share it *and* the
  divergence between them can be described in an input or a `make` target. Premature
  abstraction here creates flags that nobody understands.

## Naming conventions

### Reusable workflows (`.github/workflows/`)

`[<stack>-][<variant>-]<purpose>.yml`

- **Generic workflows have no prefix**: `pull-request.yml`, `publish.yml`, `release.yml`,
  `deploy.yml`, `destroy.yml`.
- **Stack-specific workflows are prefixed with the stack**: `javascript-pull-request.yml`,
  `javascript-publish.yml`.
- **A variant goes between the stack and the purpose.** `javascript-application-publish.yml`
  publishes a deployable *application* (image plus deploy bump), as opposed to a *library*
  (a package) or a bare tag (`publish.yml`).
- **Do not put implementation details in the name.** Terraform is the default
  implementation behind `release.yml`, `deploy.yml` and `destroy.yml`, so it is not in the
  name. A name should still be true if the tool changes.
- **Do not name a workflow after a framework when it is not framework-specific.**
  `nextjs-publish.yml` was renamed because nothing about it was specific to Next.js.
- Use `pull-request`, `publish`, `release`, `deploy`, `destroy` consistently as the
  purpose. Do not invent synonyms.

The library's own pipelines are prefixed `self-` (`self-pull-request.yml`,
`self-publish.yml`) so they never collide with the reusable workflows of the same purpose.
They call the local reusable workflows through `./.github/workflows/...`, so the library
runs the same pipeline spokes do.

### Composite actions (`actions/`)

`actions/<domain>/<verb>` or `actions/<stack>/<area>/<verb>`, e.g. `actions/terraform/plan`,
`actions/javascript/expo/quality-gate`, `actions/aws/codeartifact-token`.

- Folders are nouns (technology, service, or concern); the leaf is the action's verb or
  role.
- A generic action lives at the top level (`actions/quality-gate`, `actions/publish`).

### Inputs, secrets and outputs

- **kebab-case everywhere** (`github-app-client-id`, `expo-working-directory`).
- **Prefix with the service when more than one exists.** `codeartifact-aws-region` versus
  `ecr-aws-region`, because those services can be in different accounts and regions.
- Environment variables that are exported to `make` keep their conventional upper-case
  names (`AWS_ACCOUNT_ID`, `REGISTRY_NAMESPACE`), because scripts already read them.
- Boolean inputs are named for the thing they enable (`visual-tests`), not `enable-...`.

### Job and check names (these are API)

- **Reusable workflow job names are short Title Case nouns**: `Core`, `Expo`,
  `Visual Tests`, `Create Version`, `Request Deployment`. They must **not** repeat the
  context (no `Quality Gate | Core` inside the job; the caller supplies `Quality Gate`).
- **Caller jobs are named `Quality Gate`** (id `quality-gate`) so the reported check is
  `Quality Gate / Core`.
- Do not use the `|` separator. The `/` separator is GitHub's own for reusable workflows,
  and mixing the two produced names like `quality-gate / Quality Gate | Core`.

### Git and releases

- Tags are plain versions (`7.0.0`) plus a floating major tag (`v7`). Callers pin the
  major.
- Commits follow Conventional Commits. A breaking change uses `feat!:` or a
  `BREAKING CHANGE:` footer.

## Why names matter: required status checks

**Check names are a contract with branch protection.**

Required checks are enforced from the admin repository's safe-settings configuration
(rulesets under `.github/suborgs` and `.github/repos`). A ruleset matches a status check
by its **exact reported name** and the app that reports it (GitHub Actions,
`integration_id: 15368`). Rename a job and the ruleset keeps waiting for a check that is
no longer reported. The pull request is blocked with "Expected, waiting for status" and
never unblocks.

What forms the name:

```
<caller job name, or its id if no name> / <job name inside the reusable workflow>
        Quality Gate                      /          Core
```

- The **workflow name** and the `(pull_request)` suffix shown in the UI are display only
  and are **not** part of the name.
- A job that calls a reusable workflow *replaces* the called workflow's own name with the
  caller's job name. This is why the caller job name is part of the contract and why
  every caller must name it `Quality Gate`.
- A reusable workflow job that has no `name` is reported by its id.

Consequences:

1. **Renaming a job is a breaking change.** It requires a major version, a changelog entry
   (a separate `BREAKING CHANGE:` paragraph per renamed check), and a coordinated change to
   the rulesets.
2. **Cutover must be coordinated.** A ruleset cannot accept both the old and the new name,
   so the ruleset update and the spoke migrations land together. Spoke pull requests that
   report the new name stay blocked until the ruleset requires it, and a repository that
   merges first would leave the old required check unreported. Sequence them: fix anything
   that would make the new checks fail (for example a pre-existing failing check that is
   about to become required), merge the ruleset change, then merge the spoke pull requests.
3. **The default is one rule for everyone.** `Quality Gate / Core` is required for every
   repository. Optional checks are required only where they apply: for a repository with
   Expo, add `Quality Gate / Expo`; for one with visual tests, add
   `Quality Gate / Visual Tests`. These are additive per-repository rulesets.
4. **A skipped optional job still reports a (skipped) check**, which satisfies a required
   check. Requiring `Expo` for a repository that has no Expo app would therefore pass
   vacuously, so require optional checks only where the input is set.
5. **Never skip the whole workflow with trigger filters** (`paths:` on the pull request
   workflow) when its checks are required. A workflow that did not run reports nothing, and
   the required check stays pending.

When you change a name, search the admin repository for the old one.

## Versioning and releases

- The repository versions itself with commitizen (`tag_format: $version`). A `feat!` or a
  `BREAKING CHANGE:` bumps the major version.
- The changelog is a flat list of commit message paragraphs. Each `BREAKING CHANGE:` must
  be its own blank-line-separated paragraph, or several breaking changes merge into one
  bullet. Use a single commit per pull request and verify with
  `cz bump --dry-run --changelog`.
- **Internal references use the major tag.** A reusable workflow calls actions as
  `.../actions/foo@v7`, not by a relative path, because the actions are shipped and
  versioned together. A major release updates these internal references in the same
  breaking pull request.
- **Exception: local calls between reusable workflows** (`./.github/workflows/publish.yml`)
  resolve at the same commit as the caller, so they never skew.
- A new major tag does not exist until the release job creates it. That is why a major
  upgrade ships in two steps: the breaking pull request, then a follow-up that moves the
  library's own pipelines and spokes to the new tag.
- **Spokes pin the major** (`@v7`) and receive minor and patch fixes automatically. A fix
  that changes behavior for a spoke (such as making a gate stricter) is still a `fix` or
  `feat`; only contract changes (names, inputs, required variables, job graph) are major.

## Security and credentials

- **Credentials stay in the hub.** OIDC and AWS role assumption, CodeArtifact tokens,
  ECR login and GitHub App tokens are implemented once, here, so there is one place to audit
  and rotate.
- **Least privilege per job.** Each reusable job declares only the permissions it needs.
  The caller must grant at least that (a reusable workflow cannot elevate), so callers grant
  exactly what the called workflow documents in its header.
- **Pass secrets explicitly.** Do not use `secrets: inherit`. Each workflow lists the
  secrets it accepts, and callers map them by name. That keeps the contract visible.
- **Read configuration from repository variables.** Reusable JavaScript workflows read
  the caller repository's `vars` (`AWS_CODE_ARTIFACT_*`, `AWS_ROLE_TO_ASSUME`, ...), so
  callers don't repeat them, and non-secret values are not passed as inputs.
- **GitHub App tokens bypass branch protection deliberately.** Publishing pushes a version
  commit and tag to a protected branch with an app token, not a personal access token.

## GitHub Actions constraints that shape the design

These are the facts behind decisions above. They save a re-investigation.

- A job's `if:` can read `inputs`, `vars`, `needs`, `github`, but **not `secrets`**.
- The path in `uses:` **cannot be dynamic**. A workflow cannot choose a sub-workflow from
  an input, so per-language behavior is either a different workflow or a `make` target.
- A reusable workflow's `vars` context is the **caller's** repository variables.
- Composite actions **cannot** set `runs-on`, `permissions` or `environment`, and cannot
  call reusable workflows.
- Each reusable workflow job is a **separate runner**. Jobs do not share a workspace, so
  any job that needs the code checks it out and sets up its own environment (this is why
  `Core`, `Expo` and `Visual Tests` each install dependencies in parallel).
- A required check that is **skipped counts as passing**; a check that **never reports**
  blocks.
- The caller job's `name` is part of the check name; **its absence changes the name**.
- Squash-merge settings affect the changelog. Repositories that squash with commit
  messages need a single, well-formed commit per pull request.

## Checklists

### Adding a check to an existing pipeline

1. Is it additive and switchable by a non-secret input? Add a job to the existing
   reusable workflow with a fixed `name` and an `if:`.
2. Default to **off** for behavior that existing callers have not opted into, so the change
   is not breaking.
3. Document the new check name in the README ("Required status checks").
4. For repositories that should require it, update their rulesets in the admin repository.
5. Release (`feat:`).

### Adding a new stack or technology

1. Try the generic workflows plus `make` first. Add tools via `.tool-versions` or the
   repo's own setup.
2. Only if GitHub-level needs differ (permissions, credentials, runner, ordering), add
   `<stack>-pull-request.yml` and `<stack>-publish.yml`, following the naming conventions.
3. Reuse existing actions; add a stack-specific action only for reusable step sequences.
4. Keep job names `Core` / `Expo`-style so the caller's `Quality Gate` produces the
   standard checks.

### Adding or changing a reusable workflow

1. Write a header comment: what it does, required `vars`, required caller `permissions`,
   and the check names it reports.
2. Declare inputs and secrets explicitly. Give optional inputs safe defaults.
3. Set least-privilege `permissions` on each job.
4. Name jobs deliberately. They are API.
5. Add an example caller to the README.
6. Call it from a spoke on a branch (a canary) and confirm the reported check names before
   releasing.

### Renaming anything callers or branch protection can see

1. Treat it as breaking: `feat!:` plus a separate `BREAKING CHANGE:` paragraph per change.
2. Add a migration table to the README (old name, new name).
3. Update the admin rulesets and plan the merge order (see above).
4. Release, then open the migration pull requests against the spokes.

## Known gaps

- **No job timeouts.** Jobs rely on GitHub's six-hour default, so a stalled step (such as
  a hung package mirror) can sit for hours before failing. New jobs should set
  `timeout-minutes`, and existing ones should be retrofitted.
- **`make install` is a shared cost.** Every setup runs the spoke's whole `install`
  target. Repositories should keep it to dependency installation and move test-only setup
  (such as browser installs) to the target that needs it.
