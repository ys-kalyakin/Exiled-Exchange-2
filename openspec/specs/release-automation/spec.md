# release-automation Specification

## Purpose
Tag-driven draft releases of the fork distribution, produced by the fork-only GitHub Actions release pipeline (`.github/workflows/release.yml` with the fork-local builder config `main/electron-builder.fork.yml`): installers for the platforms this fork targets are published to the fork repository, and fork-built apps self-update from those releases instead of upstream's.

## Requirements

### Requirement: Tag-driven draft releases
The release pipeline SHALL create a draft GitHub release on the fork repository (`ys-kalyakin/Exiled-Exchange-2`) when a tag matching `v*` is pushed, and the draft SHALL contain the Windows NSIS installer, the Windows portable executable, the Linux AppImage, and the electron-updater metadata files (`latest.yml`, `latest-linux.yml`). The pipeline SHALL NOT publish the release; publishing stays a manual confirmation of the draft.

#### Scenario: Tag push produces a draft release
- **WHEN** a tag matching `v*` is pushed to the fork
- **THEN** the pipeline builds and packages the distribution and attaches the installers and update metadata to a draft release for that tag
- **AND** the release remains unpublished until a maintainer confirms it

### Requirement: Manual build mode without releasing
The release pipeline SHALL be startable manually for any branch and SHALL then build the same distribution artifacts and attach them to the workflow run WITHOUT creating or modifying any GitHub release.

#### Scenario: Manual run yields artifacts only
- **WHEN** the release pipeline is dispatched manually on a branch
- **THEN** the installers are downloadable from the workflow run
- **AND** no release is created or updated

### Requirement: Fork publish target
The release pipeline SHALL resolve its publish target to the fork repository (owner `ys-kalyakin`, repo `Exiled-Exchange-2`) without modifying upstream-shared files (`main/package.json`, `main/electron-builder.yml`), and apps packaged by the pipeline SHALL carry update metadata that points at the fork's releases so self-updates come from the fork.

#### Scenario: Update feed resolves to the fork
- **WHEN** the app is packaged by the release pipeline
- **THEN** its embedded electron-updater feed references the fork repository, not the upstream repository

#### Scenario: Upstream-shared build files stay untouched
- **WHEN** the release pipeline overrides the publish target
- **THEN** `main/package.json` and `main/electron-builder.yml` remain identical to upstream

### Requirement: Tag-version consistency guard
The release pipeline SHALL fail before publishing when a pushed `vX.Y.Z` tag does not match the version `X.Y.Z` declared in `main/package.json`.

#### Scenario: Mismatched tag fails fast
- **WHEN** a tag `vX.Y.Z` is pushed whose `X.Y.Z` differs from the version in `main/package.json`
- **THEN** the pipeline fails before packaging and no release or artifacts are produced

#### Scenario: Matching tag proceeds
- **WHEN** a tag `vX.Y.Z` is pushed whose `X.Y.Z` matches the version in `main/package.json`
- **THEN** the pipeline continues to packaging and release creation

### Requirement: Release platform targets
The release pipeline SHALL produce release artifacts for Windows (NSIS installer and portable executable) and Linux (AppImage) only, and SHALL NOT produce macOS artifacts.

#### Scenario: No macOS artifacts
- **WHEN** a release draft is produced by the pipeline
- **THEN** it contains only Windows and Linux artifacts and electron-updater metadata
