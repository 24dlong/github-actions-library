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
