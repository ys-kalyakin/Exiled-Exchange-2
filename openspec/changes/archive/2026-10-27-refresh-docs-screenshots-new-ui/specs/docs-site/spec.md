# Spec Delta

## ADDED Requirements

### Requirement: Feature screenshots depict the current fork UI

Documentation pages that embed a screenshot of the application's own interface SHALL embed an image depicting the fork's current overlay UI (the game-native theme era of `renderer/src`), not the upstream legacy UI. Pages in scope are those whose images show app windows, widgets, or settings: index, quick-start, features, item-info, item-data, map-check, stash-search, widgets, extra-widgets, xp-tracker, chat-commands, complex-query, faq, private-leagues, no-item-mods, invalid-json.

#### Scenario: Feature page shows current interface

- **WHEN** a reader views an embedded app-UI screenshot on one of the in-scope pages
- **THEN** the image shows the fork's current interface (current theme, current price-check layout with rarity filter chips and hotkey row, current widget menu), not the legacy upstream layout

#### Scenario: Stale legacy-UI images are not referenced

- **WHEN** any docs page is rendered after the refresh
- **THEN** no page references a `docs/reference-images/` asset that still depicts the legacy UI for a state the current app renders differently

### Requirement: App-UI screenshots are fork-hosted assets

Screenshots of the application's own UI SHALL be committed under `docs/reference-images/` and referenced by relative path, not hosted on external image services. This extends the existing asset-resolution requirement to images: the index page's splash screenshot SHALL be served from the fork repository.

#### Scenario: Splash resolves from the fork repository

- **WHEN** the index page renders
- **THEN** its splash image is loaded from `docs/reference-images/` in the fork repository rather than from imgur

### Requirement: Screenshot regeneration procedure is documented

The documentation directory SHALL contain a page documenting how to recapture the app-UI screenshots with the browser dev harness (renderer + main dev servers over the port-8584 IPC transport, item editor, browser automation), so screenshots can be refreshed after future UI changes without the game client.

#### Scenario: Harness page explains regeneration

- **WHEN** a maintainer needs to refresh docs screenshots after a UI change
- **THEN** the harness page lists the exact steps (dev servers, harness backend, driving widget states, capturing images into `docs/reference-images/`)
