# app-update Specification

## Purpose
Self-update of the app via electron-updater (`main/src/AppUpdater.ts`): checking GitHub releases, downloading, and reporting progress states to the renderer settings UI.

## Requirements

### Requirement: Update state reporting
The updater SHALL report its state as the `UpdateInfo` union from `ipc/types.ts`: `initial` / `checking-for-update`, `update-available` (with version and `noDownloadReason`), `update-downloaded` (with version), and `update-not-available` / `error` (with `checkedAt`), and the settings UI SHALL reflect these states.

#### Scenario: New release published
- **WHEN** a check finds a newer release
- **THEN** the renderer receives `update-available` with the new version string

### Requirement: Download restrictions
The updater SHALL refuse to download with a `noDownloadReason` of `not-supported` on platforms without release artifacts and `disabled-by-flag` when updating is disabled by launch flag; otherwise the reason SHALL be `null` and the download SHALL proceed.

#### Scenario: Unsupported platform
- **WHEN** an update is available on a platform without published artifacts
- **THEN** the state includes `noDownloadReason: "not-supported"` and no download starts
