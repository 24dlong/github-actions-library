## 5.0.4 (2026-08-27)


- refactor: migrate terraform apply action to use github app token (#89)

## 5.0.3 (2026-08-27)


- chore(deps): update pre-commit hook commitizen-tools/commitizen to v4.18.0 (#88)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>

## 5.0.2 (2026-08-25)


- fix: fix expo install lockfile issue (#87)

## 5.0.1 (2026-08-25)


- chore(deps): update pre-commit hook commitizen-tools/commitizen to v4.17.1 (#86)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>
- chore: bump merge workflow to v5 (#85)

## 5.0.0 (2026-08-24)


- refactor!: migrate publish to use a GitHub App instead of a PAT when publishing versions (#84)
- BREAKING CHANGE: repositories will have to migrate from passing a PERSONAL_ACCESS_TOKEN
input to a GITHUB_WORKFLOWS_CLIENT_ID input and GITHUB_WORKFLOWS_PRIVATE_KEY input

## 4.6.0 (2026-08-20)


- feat: add support for sending tf vars to terraform plan action (#83)

## 4.5.0 (2026-08-18)


- feat: include environment name in terraform plan comment (#82)

## 4.4.0 (2026-08-18)


- feat: add a terraform deployment workflow (#81)

## 4.3.0 (2026-08-18)


- feat: support terraform plan and apply using a specific git sha (#80)

## 4.2.0 (2026-08-10)


- feat: add a version output to publish action (#79)

## 4.1.0 (2026-08-10)


- feat: add an action to create a deployment PR (#78)

## 4.0.3 (2026-08-09)


- docs: update action references to use v4 (#77)

## 4.0.2 (2026-08-09)


- fix: run terraform using mise (#76)

## 4.0.1 (2026-08-09)


- chore(deps): update 24dlong/github-actions-library action to v4 (#75)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>

## 4.0.0 (2026-08-09)


- refactor!: migrate from setup-lint to more generic setup-env make command (#74)
- BREAKING CHANGE: repository's making use of a setup-lint command will
need to migrate to a setup-env command

## 3.11.9 (2026-08-07)


- fix: fix artifact retrieval for terraform apply action (#72)

## 3.11.8 (2026-08-07)


- chore(deps): update aws-actions/configure-aws-credentials action to v6 (#68)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>
Co-authored-by: Daniel Long <24.daniel.long@gmail.com>

## 3.11.7 (2026-08-07)


- fix: set EAS_NO_FROZEN_LOCKFILE in expo-upgrade (#71)

## 3.11.6 (2026-08-07)


- fix: skip frozen-lockfile install in expo-upgrade (#70)

## 3.11.5 (2026-08-06)


- chore(deps): update hashicorp/setup-terraform action to v4 (#69)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>

## 3.11.4 (2026-08-05)


- chore(deps): update actions/upload-artifact action to v7 (#67)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>
Co-authored-by: Daniel Long <24.daniel.long@gmail.com>

## 3.11.3 (2026-08-05)


- chore(deps): update actions/github-script action to v9 (#66)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>

## 3.11.2 (2026-08-04)


- docs: rename terraform actions (#65)

## 3.11.1 (2026-08-04)


- fix: correct tag sort when bumping versions (#64)

## 3.11.0 (2026-08-04)


- feat: add terraform plan and apply actions (#63)

## 3.10.1 (2026-08-04)


- chore(deps): update pre-commit hook commitizen-tools/commitizen to v4.17.0 (#62)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>

## 3.10.0 (2026-08-03)


- feat: support minimumReleaseAge for storybook-upgrade (#61)

## 3.9.4 (2026-08-01)


- chore(deps): update pre-commit hook pre-commit/pre-commit-hooks to v6 (#60)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>

## 3.9.3 (2026-07-31)


- chore(deps): update pre-commit hook commitizen-tools/commitizen to v4.16.5 (#59)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>

## 3.9.2 (2026-07-29)


- chore(deps): update actions/setup-python action to v7 (#48)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>
Co-authored-by: Daniel Long <24.daniel.long@gmail.com>

## 3.9.1 (2026-07-29)


- chore(deps): update pnpm/action-setup action to v6 (#58)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>
- ci: update pull_request workflow to use shared action (#54)
- ci: remove redundant steps from merge workflow (#56)

## 3.9.0 (2026-07-28)


- fix: correct merge workflow github token (#57)
- fix: rollback merge change until publish action changes are published (#55)
- feat: add generic quality gate action (#53)
- feat: further centralize publish action (#52)
- ci: update merge workflow to use shared action (#51)

## 3.8.0 (2026-07-28)


- feat: add a generic publish action (#50)

## 3.7.5 (2026-07-28)


- chore(deps): update aws-actions/configure-aws-credentials action to v6 (#49)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>

## 3.7.4 (2026-07-27)


- chore(deps): update actions/setup-python action to v6 (#47)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>
Co-authored-by: Daniel Long <24.daniel.long@gmail.com>

## 3.7.3 (2026-07-27)


- chore(deps): update actions/setup-node action to v7 (#46)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>

## 3.7.2 (2026-07-25)


- chore(deps): update actions/checkout action to v7 (#44)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>

## 3.7.1 (2026-07-25)


- chore(deps): update commitizen-tools/commitizen-action action to v0.27.1 (#43)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>
- Add renovate.json (#34)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>
Co-authored-by: Daniel Long <24.daniel.long@gmail.com>

## 3.7.0 (2026-07-24)


- feat: add composite action for upgrading expo dependencies (#42)

## 3.6.1 (2026-07-24)


- fix: fix broken install (#41)

## 3.6.0 (2026-07-19)


- feat: add storybook upgrade action (#40)

## 3.5.0 (2026-07-17)


- feat: add storybook doctor checks (#39)

## 3.4.0 (2026-07-13)


- feat: add a check to build ios storybook (#38)

## 3.3.0 (2026-07-08)


- feat(visual-tests): autoAcceptChanges on the main branch (#37)

## 3.2.0 (2026-07-07)


- feat(expo): adds a quality gate for expo projects (#36)

## 3.1.0 (2026-07-07)


- feat(visual-tests): support private registry auth (#35)

## 3.0.5 (2026-05-20)


- fix(publish): add missing env vars to publish step (#33)

## 3.0.4 (2026-05-20)


- fix(publish): fix typo in publish input (#32)

## 3.0.3 (2026-05-19)


- fix(publish): fix typo in publish input (#31)

## 3.0.2 (2026-05-19)


- fix(actions): add missing inputs (#30)

## 3.0.1 (2026-05-19)


- build(config): add support for ! commits as a method for indicating breaking changes (#29)

## 3.0.0 (2026-05-19)


- fix(actions): updates internal quality-gate usage to v3 (#28)
- BREAKING CHANGE: to standardize to one registry auth process, both the publish command and the install command should now include private registry authentication built in

## 2.2.1 (2026-05-19)


- build(publish): ensure breaking changes result in major version bumps (#27)

## 2.2.0 (2026-05-19)


- feat: adds support for private registry installs (#26)
- BREAKING CHANGE: to standardize to one registry auth process, the publish command has been migrated to use a registry-auth make command as well

## 2.1.5 (2025-08-13)


- fix(visual-tests): auto accept visual changes merged into main (#24)

## 2.1.4 (2025-08-12)


- refactor: decouple visual test execution from action status control (#23)

## 2.1.3 (2025-07-21)


- fix(visual-tests): add missing shell attribute (#22)

## 2.1.2 (2025-07-21)


- fix(visual-tests): use proper composite action syntax (#20)
- ci: rename quality gate job (#21)

## 2.1.1 (2025-07-21)


- fix: remove impotent runs-on (#19)

## 2.1.0 (2025-07-21)


- feat: add an action for running chromatic visual tests (#18)

## 2.0.2 (2025-04-16)


- chore: migrate all actions to use quality-gate@v2 (#17)

## 2.0.1 (2025-04-16)


- build: add additional commit verbs to the commitizen bump map (#16)

## 2.0.0 (2025-04-16)

### BREAKING CHANGE

- requires the use of pnpm instead of yarn as the package manager


- migrate from yarn to pnpm (#15)

## 1.3.0 (2025-03-28)

### Feat

- introduces a generic javascript publish action (#13)

## 1.2.1 (2025-03-15)

### Refactor

- pin quality-gate major version within publish action (#11)

## 1.2.0 (2025-03-15)

### Feat

- add a composite action for publishing javascript libraries (#10)

## 1.1.1 (2025-03-07)

### Fix

- **ci**: add an exception for the version bump commit (#9)

## 1.1.0 (2025-03-07)

### Feat

- create a javascript quality gate action

### Fix

- fix merge workflow permissions (#8)
- add administrator permissions to merge workflow (#7)
