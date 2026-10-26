# Proposal: add-fork-release-automation

## Why

The fork builds installers in CI but publishes nothing: the upstream `Build` workflow (green on `master`) runs `electron-builder` with `-p onTagOrDraft`, and since the fork has no tags and no draft releases, publishing is silently skipped — the workflow succeeds and the artifacts are discarded. Even if it tried, the `github` publish target resolves from `main/package.json` `repository.url` to the upstream repository (`Kvan7/exiled-exchange-2`), which the fork's `GITHUB_TOKEN` cannot write to, and the workflow lacks `contents: write`. The result: the fork has zero releases, no automatic distribution, and — because `electron-updater` resolves its feed from the same publish config baked into `app-update.yml` — any fork-built app would offer updates from upstream releases and lose fork features (gamepad, Wayland backend) on update.

## What Changes

- **New fork-only release workflow** `.github/workflows/release.yml`:
  - Triggers on `v*` tag push and on manual `workflow_dispatch`.
  - Builds the renderer once, then packages in a matrix over **Windows** (NSIS + portable) and **Linux** (AppImage); macOS is dropped from release packaging (not targeted by this fork).
  - Publishes to the fork repository (`ys-kalyakin/Exiled-Exchange-2`) with `contents: write` permission; releases are created as **drafts** (`releaseType: draft`) and are confirmed manually.
  - Publish policy `onTag`: tag builds publish into the draft release for that tag; manual runs skip publishing and upload their installers as workflow run artifacts for testing.
  - Guards tag/version consistency: a `vX.Y.Z` tag must match the version in `main/package.json`, failing fast otherwise.
- **New fork-only builder config** `main/electron-builder.fork.yml` extending the upstream `main/electron-builder.yml`, overriding only `publish` (provider `github`, owner `ys-kalyakin`, repo `Exiled-Exchange-2`, `releaseType: draft`). This also fixes the update channel: `app-update.yml` inside fork-built apps resolves to the fork's releases.
- **Lint fix** in fork-added code: `main/src/main.ts:187` — braces in the `.then(() => app.exit())` callback to satisfy `@typescript-eslint/no-confusing-void-expression`; this is the only reason `test.yml` is red on the gamepad PRs.
- **Manual repo-settings actions** (no file edits): disable the upstream `Build` workflow (pointless triple-OS packaging on every master push) and the `Docs` workflow (fails because GitHub Pages is not enabled in the fork) in the fork's Actions settings.

## Capabilities

### New Capabilities

- `release-automation`: tag-driven draft releases of the fork distribution (Windows NSIS + portable, Linux AppImage, electron-updater metadata) from GitHub Actions, publishing to the fork repository with a version/tag guard and an on-demand manual build mode.

### Modified Capabilities

- (none — `app-update` describes runtime updater behavior (`main/src/AppUpdater.ts` state reporting and download restrictions), which does not change; this change only determines which repository the update feed resolves to at packaging time)

## Impact

- Code: new `.github/workflows/release.yml`, new `main/electron-builder.fork.yml`, one-line change in `main/src/main.ts` (fork-added KWin quit handler). No changes to `main/package.json`, `main/electron-builder.yml`, or upstream workflow files.
- Upstream mergeability: the only upstream-shared file touched is `main/src/main.ts`, and only inside fork-added lines (the KWin `will-quit` cleanup from commit `0cb71a2a`) — upstream lines are untouched. All new files are fork-only and never conflict on upstream merges.
- Gamepad feature: unaffected. Linux support: positively affected — the fork gains official AppImage releases alongside Windows; the lint fix sits in the KWin (Wayland) quit path with no behavior change (identical callback, braces added).
- Update channel: fork-installed apps (NSIS) will self-update from fork releases; portable builds keep the existing no-auto-download behavior (`PORTABLE_EXECUTABLE_DIR`, `main/src/AppUpdater.ts`); macOS remains the "unsupported platform" case already specified in `app-update`.
- Out of scope: code signing, macOS packaging, continuous/nightly releases per master push, enabling GitHub Pages (the Docs workflow is disabled instead), `main/yarn.lock` working-tree cleanup, changes to upstream CI files.
