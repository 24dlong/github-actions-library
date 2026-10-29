## 7.7.0 (2026-10-29)


- feat: add a working-directory input to expo-upgrade (#118)
- Lets monorepos run expo install --fix in the Expo app's directory
(e.g. apps/mobile). Defaults to the repository root, so existing
callers are unchanged.
- Co-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>

## 7.6.0 (2026-10-29)


- feat: publish JS-only Expo changes as OTA updates instead of store builds (#117)
- Add an Expo Fingerprint action and job. For each platform it compares the
spoke's native fingerprint with the one recorded for the last native build
and chooses a native build (changed, missing, unreadable, forced) or an OTA
update (unchanged). Add an Update job that runs the spoke's make update on
Ubuntu, attach mobile-fingerprint-* and mobile-ota-* assets in Release, and
let Detect count mobile-ota-* records as handled. The Summary gains OTA
rows, an update-failed stage and an OTA-only headline. Spokes without the
fingerprint and update targets, or with ota: false, keep building natively.
- Co-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>

## 7.5.0 (2026-10-28)


- feat: add a failure banner with recovery steps to the Expo publish summary (#116)
- Summary now opens with a status banner. A failed build, a submission that
could not be queued, a store rejection or timeout, or failed release assets
become cautions with a stage-specific recovery list and ::error annotations,
so a red run is understandable without reading job logs. A failed metadata
push is a warning. Summary also runs when Detect fails.
- Removes the Collect/Upload iOS gym logs steps from the build action: the
~/Library/Logs/gym directory never exists in eas local builds, so they never
uploaded anything.
- Co-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>

## 7.4.2 (2026-10-27)


- fix: read the submission status line instead of make's exit code (#115)
- make reports any failed recipe as exit 2, so the spoke's exit 3 for "still
running" reached the Submissions job as a tool error and failed it after five
polls (run 40574876645) although both submissions finished normally. The poll
now classifies the "status=<STATUS>" line the spoke prints and keeps the
fail-fast on polls that return no status.
- Co-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>

## 7.4.1 (2026-10-27)


- fix: repair Expo submit follow-ups found in the first 7.4.0 run (#114)
- - Stop passing the release notes to the submit step. EAS rejected
  --what-to-test ("changelog" is Enterprise plan only), which failed iOS submit.
- Submissions now installs dependencies (setup, not setup-no-install): eas
  loads the app config and its plugins even to read a submission, so every poll
  failed. The poll now prints eas's full output on tool errors and stops after
  five in a row instead of retrying until the deadline.
- Release passes --repo to gh release upload; the job has no checkout.
- Android: drop the unnecessary free-disk step (the root disk had 88 GB free).
  The build died under /tmp with "Disk quota exceeded", and building in
  /mnt/eas-build is what fixed it. Report df for /tmp as well.
- Co-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>

## 7.4.0 (2026-10-27)


- feat: queue Expo submissions without waiting, check them on Ubuntu, fix Android disk (#113)
- * fix: keep Android Expo builds from filling the runner disk
- The Android build died with "Disk quota exceeded" on a standard runner
(Gradle lint, CMake and the lockfile writes). Free preinstalled toolchains the
build does not use, move the eas build working directory to /mnt, and print df
before and after so the next failure shows numbers.
- Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
- * feat: queue Expo submissions without waiting and check them on Ubuntu
- eas submit waited for the store on the macOS runner and hit the job timeout
(48 minutes of 10x minutes). The submit step now only queues the submission and
reports its URL and id. A new Submissions job polls the spoke's submit-status
target on Ubuntu and fails the run if a store rejects the build. The summary
shows queued, delivered, rejected or timed out with a link, and Metadata now
runs only after Submissions passed.
- iOS submissions also pass the release notes to the spoke as
RELEASE_NOTES_FILE, which the app turns into TestFlight "What to Test".
- Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
- * fix: allow Submissions to wait up to 85 minutes
- An observed iOS submission took 55 minutes on the EAS queue, longer than the
55-minute poll deadline planned for it.
- Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
- ---------
- Co-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>

## 7.3.0 (2026-10-26)


- feat: attach Expo builds to the release and add store handoff steps (#112)
- Adds release, notes and metadata jobs to expo-application-publish.yml and
extends the summary with release links, draft notes and the spoke's handoff
checklist. Detect now compares against the last release that has mobile
build assets, so a failed or dropped mobile build is retried by the next
release.
- New inputs release-assets (default true) and metadata (default false).
Callers must grant contents: write to the mobile job before moving @v7.
- Co-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>

## 7.2.0 (2026-10-23)


- feat: detect native changes before Expo builds and support forced builds (#111)
- Add actions/javascript/expo/detect, which compares v<version> with the
previous v* tag over the caller's paths. expo-application-publish.yml
gains paths and force inputs, and version is now optional (a forced run
with nothing released builds the latest v* tag).
- Co-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>

## 7.1.3 (2026-10-21)


- fix: save Expo native caches before submit and report build and submit separately (#109)
- * fix: save Expo build caches before submit and split build and submit in the summary
- setup-node's pnpm cache and actions/cache save in post steps that run only
when the job succeeds, so an iOS job that failed at submit never saved and
every run started cold. The pnpm store, CocoaPods and the React Native
tarballs (~/Library/Caches/ReactNative) are now restored with
actions/cache/restore and saved right after a successful install or package
step, on a key miss only.
- Mobile / Summary now reports build and submit separately per platform
(for example "Build succeeded, submit failed") with the artifact name, path
and build number.
- Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012GceBjDdE8LDfZjXxKV5mf
- * fix: prune the pnpm store before saving it
- When the restore misses the exact key, the store comes from a restore-keys
fallback built for an older lockfile, and saving it as is carries every
superseded package forward. Run `pnpm store prune` after install, right
before the save, on the same key-miss path. Prune removes only packages no
installed project references (checked on pnpm 10.12.4 and 11.28.6 with
clone and hardlink imports: an offline reinstall still succeeds). It runs
with continue-on-error so a failed prune never fails the job or skips the
save.
- Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012GceBjDdE8LDfZjXxKV5mf
- * revert: drop the pnpm store cache and prune changes
- The pnpm store cache miss is left to the monorepo pnpm 11 bump. The
JavaScript setup actions go back to setup-node's built-in pnpm cache,
as on main. The Expo native cache split and the Summary changes stay.
- Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012GceBjDdE8LDfZjXxKV5mf
- ---------
- Co-authored-by: Claude Opus 5.5 (1M context) <noreply@anthropic.com>

## 7.1.2 (2026-10-20)


- chore(deps): update dependency ubuntu to v26 (#110)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>

## 7.1.1 (2026-10-19)


- fix: key the Expo CocoaPods cache on the lockfile (#108)
- * fix: free Android disk and make Expo build caches hit
- The Android Expo build ran out of disk in the release CMake step. Free
disk before setup by removing .NET, GHC, CodeQL, unused NDKs (keeping
27.1.12297006), the emulator, system images and Docker images, and log
df -h before and after.
- Pin the pnpm store to one path so setup-node's pnpm cache restores the
same directory whatever layout action-setup leaves at PNPM_HOME.
- Key the CocoaPods cache on pnpm-lock.yaml (and ios/Podfile.lock when
present) with a restore prefix, so it refreshes instead of being saved
once under a fixed key.
- Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012GceBjDdE8LDfZjXxKV5mf
- * fix: drop Android disk cleanup step from Expo build
- Remove the "Free disk space" step and its README text. Android disk
exhaustion is handled in the spoke instead (no Playwright in install,
arm-only ABIs). Keep the CocoaPods cache key and pnpm store pin.
- Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012GceBjDdE8LDfZjXxKV5mf
- * fix: drop pnpm store pin from setup-no-install
- action-setup bootstraps with pnpm 11 and then switches to the repo's
packageManager, so repos should bump pnpm to match instead. The earlier
cache miss is also explained by setup-node only saving its cache on
successful jobs.
- Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012GceBjDdE8LDfZjXxKV5mf
- ---------
- Co-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>

## 7.1.0 (2026-10-17)


- feat: add an Expo application publish workflow (#107)
- Co-authored-by: Cursor <cursoragent@cursor.com>

## 7.0.6 (2026-10-15)


- chore(deps): update pre-commit hook commitizen-tools/commitizen to v4.19.2 (#106)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>

## 7.0.5 (2026-10-11)


- chore(deps): update pre-commit hook commitizen-tools/commitizen to v4.19.1 (#105)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>

## 7.0.4 (2026-10-10)


- fix: run terraform plan and apply through the consumer Makefile (#104)
- Co-authored-by: Cursor <cursoragent@cursor.com>

## 7.0.3 (2026-10-08)


- fix: use a conventional commit title for tfvars bump pull requests (#103)
- Co-authored-by: Cursor <cursoragent@cursor.com>

## 7.0.2 (2026-10-08)


- docs: add ARCHITECTURE.md explaining the repository's design philosophy (#102)
- Co-authored-by: Cursor <cursoragent@cursor.com>

## 7.0.1 (2026-10-08)


- chore: use shared workflows for the library's own CI (#101)
- Co-authored-by: Cursor <cursoragent@cursor.com>

## 7.0.0 (2026-10-07)


- feat!: standardize reusable workflows and check names (#100)
- Add reusable pull-request.yml, publish.yml, release.yml, javascript-pull-request.yml and javascript-publish.yml.
- Rename terraform-deploy.yml and terraform-destroy.yml to deploy.yml and destroy.yml, and remove nextjs-pull-request.yml in favor of javascript-pull-request.yml.
- Rename nextjs-publish.yml to javascript-application-publish.yml and actions/nextjs/publish to actions/application/publish, and rebuild the workflow on javascript-publish.yml.
- Rename the repository's own workflows to self-pull-request.yml and self-publish.yml.
- Visual Tests gates the release in javascript-publish.yml when it is enabled, instead of running in parallel with it.
- BREAKING CHANGE: terraform-deploy.yml, terraform-destroy.yml and nextjs-publish.yml are renamed to deploy.yml, destroy.yml and javascript-application-publish.yml, and actions/nextjs/publish is renamed to actions/application/publish.
- BREAKING CHANGE: nextjs-pull-request.yml and actions/nextjs/quality-gate are removed; use javascript-pull-request.yml and actions/javascript/quality-gate.
- BREAKING CHANGE: reusable pull request jobs are named Core, Expo and Visual Tests; with a caller job named Quality Gate, the required checks become Quality Gate / Core, Quality Gate / Expo and Quality Gate / Visual Tests. See the v7 migration guide in the README.
- Co-authored-by: Cursor <cursoragent@cursor.com>

## 6.0.1 (2026-10-02)


- chore: bump internal workflows to v6 (#99)
- Co-authored-by: Cursor <cursoragent@cursor.com>

## 6.0.0 (2026-10-02)


- feat!: add nextjs pipelines and centralize CodeArtifact auth (#98)
- * feat!: add nextjs pipelines and centralize CodeArtifact auth
- - add actions/aws/codeartifact-token; setup-no-install exports CODEARTIFACT_AUTH_TOKEN
- docker/publish: optional CodeArtifact inputs and image-tag output
- javascript/publish: released and version outputs; library/publish wraps it
- add actions/nextjs/quality-gate and actions/nextjs/publish
- add reusable nextjs-pull-request.yml and nextjs-publish.yml workflows
- move internal action references to @v6
- BREAKING CHANGE: javascript/expo/quality-gate only runs Expo checks and no longer runs the base quality gate. tfvars-bump-pr defaults variable to image_tag.
- Co-authored-by: Cursor <cursoragent@cursor.com>
- * refactor!: kebab-case inputs with service-prefixed AWS names
- - every action input is kebab-case
- CodeArtifact inputs are codeartifact-*; docker/publish ECR inputs are ecr-*
  (ecr-aws-region defaults to the region in ecr-repository-uri)
- setup-no-install exports the registry env vars once; drop duplicated env blocks
- expo-upgrade declares the github-app-private-key input it already used
- BREAKING CHANGE: action inputs are renamed; see the v6 migration table in the README.
- Co-authored-by: Cursor <cursoragent@cursor.com>
- ---------
- Co-authored-by: Cursor <cursoragent@cursor.com>

## 5.2.0 (2026-09-30)


- feat: add ecr-publish and tfvars-bump-pr actions (#97)
- * feat: add ecr-publish and tfvars-bump-pr actions
- ecr-publish builds a single-platform, attestation-free image (Lambda-compatible) and pushes it to ECR via OIDC, outputting a digest-pinned image URI. tfvars-bump-pr opens an idempotent cross-repo PR setting one variable in environments/<env>/terraform.tfvars using a GitHub App token.
- Co-authored-by: Cursor <cursoragent@cursor.com>
- * refactor: split tfvars-bump-pr target into owner and repository inputs
- Co-authored-by: Cursor <cursoragent@cursor.com>
- ---------
- Co-authored-by: Cursor <cursoragent@cursor.com>

## 5.1.4 (2026-09-30)


- chore(deps): update pre-commit hook commitizen-tools/commitizen to v4.19.0 (#96)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>

## 5.1.3 (2026-09-21)


- chore(deps): update pre-commit hook commitizen-tools/commitizen to v4.18.1 (#95)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>

## 5.1.2 (2026-09-07)


- refactor: use same github env for plan and apply destroy (#94)

## 5.1.1 (2026-09-04)


- chore(deps): update actions/download-artifact action to v8 (#93)
- Co-authored-by: 24dlong-renovate[bot] <286791535+24dlong-renovate[bot]@users.noreply.github.com>

## 5.1.0 (2026-09-04)


- feat: add reusable terraform destroy workflow (#92)
- Co-authored-by: Cursor <cursoragent@cursor.com>

## 5.0.6 (2026-08-28)


- fix: update deployment-pr checkout to use default token (#91)

## 5.0.5 (2026-08-28)


- refactor: migrate deployment-pr to use an app token (#90)

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
