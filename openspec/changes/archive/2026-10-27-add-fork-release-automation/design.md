# Design

## Context

See proposal.md — Why. Current state (verified during exploration): the upstream `Build` workflow packages all three OSes on every master push and succeeds, but `electron-builder` runs with `-p onTagOrDraft` and the fork has no tags and no draft releases, so publishing is silently skipped; the GitHub publish provider resolves owner/repo from `main/package.json` `repository.url` (= upstream `Kvan7/exiled-exchange-2`); the workflow has no `permissions` block; the fork has zero releases. The same publish config is what electron-builder bakes into each packaged app's `app-update.yml`, which `electron-updater` (`main/src/AppUpdater.ts`) consumes — today it points at upstream. Project constraints (`openspec/config.yaml`): keep upstream-shared files mergeable, minimal localized fork edits; Windows first, Linux second, no macOS.

## Goals / Non-Goals

**Goals:**

- One tagged push produces a reviewable draft release with installers + update metadata for Windows and Linux.
- Fork-built apps self-update from the fork's releases, without touching any upstream-shared build file.
- A manual one-click build mode for test installers on any branch.
- `test.yml` green on PRs (lint fix included).

**Non-Goals:**

- Code signing, macOS packaging, continuous per-push releases, GitHub Pages enablement, upstream CI modernization, autoupdate behavior changes in `main/src/AppUpdater.ts`.

## Decisions

### D1: Fork-only files instead of editing upstream-shared ones
New `.github/workflows/release.yml` + new `main/electron-builder.fork.yml`; upstream `main.yml`, `pages.yml`, `main/package.json`, `main/electron-builder.yml` stay byte-identical. Alternative considered — editing `main.yml` (tag trigger, permissions, publish override) and `repository.url` — rejected: heavier merge friction on every upstream sync, against the project's mergeability constraint. Trade-off: the build steps are duplicated between `main.yml` and `release.yml`; acceptable because `main.yml` gets disabled on the fork (D8) and its shape still serves upstream.

### D2: Publish override via a dedicated config file with `extends`
`main/electron-builder.fork.yml` contains `extends: ./electron-builder.yml` and overrides only `publish` (`provider: github`, `owner: ys-kalyakin`, `repo: Exiled-Exchange-2`, `releaseType: draft`); the workflow invokes `npm run package "--" --config electron-builder.fork.yml -p onTag`. Alternative considered — CLI dot-override (`-c.publish.owner=…`): upstream config declares `publish` as an array (`publish: ["github"]`), and deep-merging an object CLI override into that array has uncertain semantics in electron-builder; a config file with `extends` is documented and unambiguous. Fallback if `extends` misbehaves at apply time: inline the full publish object via `-c.publish='{provider: github, owner: ys-kalyakin, repo: Exiled-Exchange-2, releaseType: draft}'`. Both paths also fix `app-update.yml` (it is generated from the resolved publish config), which is what repoints the update channel.

### D3: Publish policy `onTag`, `releaseType: draft` explicit
`onTag` publishes only when the run ref is a tag — a manual dispatch can then never upload into an existing draft by accident, while re-running a failed tag build still publishes (the re-run keeps the tag ref). `onTagOrDraft` was rejected for exactly the dispatch-into-existing-draft window. Draft type is set explicitly rather than relying on the default.

### D4: Renderer built once, shared to the packaging matrix
Same pattern as upstream `main.yml`: renderer job → `actions/upload-artifact` → matrix job downloads it. Matrix: `windows-2025` + `ubuntu-22.04` (`macos-14` dropped). Action/node versions aligned with upstream `main.yml` (checkout@v6, setup-node@v6, node 24, upload-artifact@v7, download-artifact@v8) so the file reads consistently. This matrix minus mac is already proven green in the fork's `Build` runs, including the native deps (`node-hid`, `uiohook-napi`, `electron-overlay-window`, `gamepad-io`).

### D5: Tag-version guard before packaging
On tag builds, compare `GITHUB_REF_NAME` against the version in `main/package.json` (`vX.Y.Z` ⇔ `X.Y.Z`) and fail the job early on mismatch. Upstream does this check only locally via `versionCheck.py`; a CI-side guard prevents a draft release labeled with the wrong version from ever being created. Implemented as a small shell/node step, no new scripts committed.

### D6: Manual dispatch mode = same build, artifacts only
When the run is not a tag build, packaging still runs (same command, publish skipped by policy) and `main/dist` installers are uploaded as run artifacts. Gives test installers without touching releases.

### D7: `permissions: contents: write` scoped to the release workflow
Release creation with `GITHUB_TOKEN` requires it; the workflow declares it explicitly instead of relying on repo defaults. `GH_TOKEN` env is passed to the package step only, as upstream already does.

### D8: Disable upstream `Build` and `Docs` workflows via Actions UI
Repository settings (Actions → workflow → Disable), no file edits — survives upstream merges and is reversible in the UI. Chosen over adding repository-conditions to the workflow files (would edit upstream-shared files) and over enabling GitHub Pages for `Docs` (the fork does not need a docs mirror). The release pipeline fully replaces `Build`'s role on the fork.

### D9: Lint fix = braces, nothing else
`main/src/main.ts:187` `.then(() => app.exit())` → `.then(() => { app.exit(); })` — identical behavior, satisfies `@typescript-eslint/no-confusing-void-expression`, touches only fork-added lines (KWin `will-quit` cleanup), keeps `test.yml` green on PRs.

## Risks / Trade-offs

- [`extends` / `--config` combination semantics] → verified at apply time by a local packaging smoke test that inspects the generated `app-update.yml` before the first tagged run (task 3.3); fallback override in D2.
- [`release.yml` must exist on the tagged commit] → workflows execute from the tagged ref, so the change must be merged to `master` before the next tag; noted in Migration Plan.
- [Draft releases accumulate if never confirmed] → intentional manual gate; drafts are visible on the releases page and deletable.
- [Fork master is behind upstream; upstream already bumped version] → first fork release may be `v0.16.3` (current `package.json` version); feeds are separate repositories so equal versions never cross-talk. After the next upstream merge, fork tags continue from the merged version.
- [macOS users of the fork lose CI builds] → none existed as releases anyway; macOS is not targeted by this fork.

## Migration Plan

1. Merge this change to `master`.
2. Disable the `Build` and `Docs` workflows in the fork's Actions settings (D8).
3. Run `release.yml` once via manual dispatch to validate the pipeline end-to-end (artifacts only, no release).
4. At release time: bump version in `main/package.json`, `npm i` in `renderer` + `main` (lockfile versions), `python versionCheck.py`, commit, `git tag v0.16.4 && git push origin v0.16.4` → draft release appears → verify artifacts → press Publish.
5. Rollback: disable `release.yml` in the UI, delete unwanted drafts; no app-side migration exists (nothing shipped yet).

## Open Questions

- None. Trigger model, platforms, and draft-vs-publish were confirmed with the user during exploration; remaining unknowns (D2 fallback) are apply-time verifications, not spec-level decisions.
