# docs-site Specification

## Purpose

The fork's VitePress documentation site (`docs/`, deployed by `.github/workflows/pages.yml`) is the documentation and distribution front page of the fork: it shows the app version, links user downloads, and directs readers to the project's own repository. It complements `release-automation`, which produces the artifacts it links to.

## Requirements

### Requirement: Docs site deploys from the fork repository

The Docs pipeline SHALL build the documentation site from the `docs/` directory and publish it to the fork repository's (`ys-kalyakin/Exiled-Exchange-2`) GitHub Pages, triggered on a push to `master` touching `docs/**` and on manual dispatch.

#### Scenario: Docs change deploys the site

- **WHEN** a commit touching `docs/**` is pushed to `master`
- **THEN** the Docs workflow builds the site and deploys it to the fork's `github-pages` environment

#### Scenario: Manual deploy run

- **WHEN** the Docs workflow is dispatched manually on a branch
- **THEN** the site is deployed from that branch's `docs/` content

### Requirement: Site version reflects the application version

The deployed site SHALL display the version declared in `main/package.json` at build time, and the documentation configuration SHALL NOT keep a separate version literal that can drift from the application version.

#### Scenario: Site shows the current app version

- **WHEN** the Docs pipeline builds the site
- **THEN** the version shown on the Download page equals the `version` in `main/package.json` of the checked-out commit

### Requirement: Download page links resolve to fork release assets

The Download page SHALL link installer and portable downloads at the fork repository's releases URL using the artifact names produced by the fork release pipeline (`Exiled-Exchange-2-Setup-<version>.exe`, `Exiled-Exchange-2-<version>.exe`, `Exiled-Exchange-2-<version>.AppImage`), and SHALL NOT link macOS artifacts or the upstream repository's releases.

#### Scenario: Download links match the published release

- **WHEN** a fork release for tag `vX.Y.Z` is published and the Download page is built
- **THEN** each download link targets `https://github.com/ys-kalyakin/Exiled-Exchange-2/releases/download/vX.Y.Z/` with the artifact name of that format for installer, portable EXE, and Linux AppImage

#### Scenario: No macOS or upstream downloads

- **WHEN** the Download page renders
- **THEN** it contains no macOS artifact row and no link pointing at the `Kvan7/Exiled-Exchange-2` releases

### Requirement: Site header project link targets the fork repository

The site header's project link SHALL point at the fork repository (`ys-kalyakin/Exiled-Exchange-2`).

#### Scenario: Header GitHub link

- **WHEN** any page of the docs site renders
- **THEN** the header project link opens the fork repository, not the upstream repository

### Requirement: Docs identify the fork as the project's home

The documentation SHALL present the fork's own site and repository as the home of this distribution: the FAQ SHALL describe them as the current project home (crediting the upstream repository as the original project), the README FAQ section SHALL link the fork's documentation site, and the project SHALL NOT tell readers that the upstream site/repository is the only official one.

#### Scenario: FAQ identifies the fork

- **WHEN** a reader opens the docs site FAQ question about the project's official website or repository
- **THEN** the answer points to the fork's Pages site and the fork repository, mentioning the upstream repository only as the original project this fork is based on

#### Scenario: README FAQ links the fork docs

- **WHEN** a reader follows the FAQ link in the repository README
- **THEN** it opens the documentation site deployed from this fork, not the upstream docs site

### Requirement: Docs assets resolve within the fork repository

Sample assets referenced by published documentation pages SHALL resolve from this fork's repository when the same file exists in the fork.

#### Scenario: Demo CSV served from the fork

- **WHEN** the item data page references the `LargeDemo.csv` sample
- **THEN** the link points to the file's raw URL in `ys-kalyakin/Exiled-Exchange-2`, which serves the same content as the upstream sample

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
