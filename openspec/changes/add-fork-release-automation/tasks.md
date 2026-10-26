# Tasks

## 1. Fork builder config

- [x] 1.1 Create `main/electron-builder.fork.yml`: `extends: ./electron-builder.yml` plus `publish` override (provider `github`, owner `ys-kalyakin`, repo `Exiled-Exchange-2`, `releaseType: draft`). Verify the file parses as YAML and is otherwise identical in spirit to the upstream config it extends.

## 2. Release workflow

- [x] 2.1 Create `.github/workflows/release.yml` skeleton: name `Release`, triggers `push: tags: ['v*']` and `workflow_dispatch`, top-level `permissions: contents: write`. Verify the YAML parses (`python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/release.yml'))"`) and the trigger/permission blocks render as expected in the Actions UI after push.
- [x] 2.2 Add the renderer job (pattern of upstream `.github/workflows/main.yml` renderer job, action/node versions aligned: checkout@v6, setup-node@v6 node 24, upload-artifact@v7): checkout, `npm ci`, `npm run make-index-files`, `npm run lint`, `npm run build`, upload `renderer-dist` (retention 1 day). Verify by running the same commands locally in `renderer/` (all green, `dist/` produced).
- [x] 2.3 Add the packaging job: matrix `[windows-2025, ubuntu-22.04]` (no macOS), `download-artifact@v8` of `renderer-dist` into `./renderer/dist`, `npm ci` + `npm run build` in `main/`, then `npm run package "--" --config electron-builder.fork.yml -p onTag` with `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`, and a summary step listing `main/dist` artifacts (`*.exe`, `*.AppImage`, `latest*.yml`). Verify by file review against the upstream package job (diff shows only matrix, config flag, publish policy, and summary-step differences).
- [x] 2.4 Add the tag-version guard step (tag builds only): fail before packaging when `GITHUB_REF_NAME` does not equal `v` + version from `main/package.json`. Verify by running the guard logic locally with a deliberately mismatched fake tag (fails) and the real package version (passes).
- [x] 2.5 Add the non-tag path: when there is no `v*` tag (manual dispatch), upload `main/dist` installers as workflow-run artifacts and publish nothing. Verify by reading the workflow: publish step is policy-gated to tags and the artifact upload is gated to non-tag runs.

## 3. Lint fix

- [x] 3.1 Fix `main/src/main.ts:187`: wrap the callback in braces — `.then(() => { app.exit(); })` (fork-added KWin `will-quit` cleanup, no behavior change). Verify: `cd main && npm run lint` no longer reports `@typescript-eslint/no-confusing-void-expression`.
  - Note: the fix arrived on `origin/master` with the 2026-10-26 pull (now at `main/src/main.ts:187-189`); verified locally, no additional edit was needed.

## 4. Verification

- [x] 4.1 Repo checks: `cd renderer && npm run lint && npm run check-types && npm run test` and `cd main && npm run lint && npm run check-types` — all green.
- [x] 4.2 Packaging smoke test on Linux (validates the `extends` config and the update feed, publishes nothing): `cd main && npm run package "--" --config electron-builder.fork.yml -p onTag` (no tag → publish skipped, no token needed; first run may download electron-builder tooling), then inspect the generated `app-update.yml` in the packaged output (`dist/linux-unpacked/resources/`) and confirm it references owner `ys-kalyakin` / repo `Exiled-Exchange-2` and `releaseType: draft`. If `extends` misbehaves, apply the documented fallback (inline publish object via `-c.publish=…`, design D2) and re-run this check.
- [x] 4.3 Live pipeline check after merging to `master`: trigger `release.yml` via manual dispatch and confirm a green run with downloadable Windows + Linux artifacts and no release created; then (optional, next release) push a real `v*` tag and confirm a draft release with installers + `latest.yml` / `latest-linux.yml` that stays unpublished.
  - Note (2026-10-27): validated live via the real tag `v0.16.3` instead of an interim dispatch run — run 40401174186: renderer + `package (windows-2025)` + `package (ubuntu-22.04)` all green, tag-version guard passed, draft release created. The dispatch-only (artifacts, no release) path was skipped as redundant; exercise it anytime via "Run workflow" to confirm it too.

## 5. Repo settings (manual, no file edits)

- [ ] 5.1 Disable the upstream `Build` workflow in the fork's Actions settings (Actions → Build → "···" → Disable). Verify: it no longer starts on the next master push.
- [ ] 5.2 Disable the `Docs` workflow the same way. Verify: no more failed Docs runs on `docs/**` pushes.

## Workflow follow-up

These are release-time / post-apply steps, not tracked implementation work:

- Merge this change to `master` before tagging anything — `release.yml` executes from the tagged commit.
- Release ritual (as upstream DEVELOPING.md): bump version in `main/package.json` → `npm i` in `renderer/` + `main/` (lockfiles) → `python versionCheck.py` → commit → `git tag v0.16.4 && git push origin v0.16.4` → draft release appears → verify artifacts → press Publish.
- After implementation is confirmed, run `/opsx:archive add-fork-release-automation` to fold the delta spec into the master specs.
