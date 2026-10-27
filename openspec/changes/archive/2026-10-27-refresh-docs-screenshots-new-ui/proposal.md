# Proposal

## Why

The documentation site is the fork's front page, but nearly every embedded screenshot still shows the upstream legacy UI (pre-game-native-theme overlay, old price-check layout without the chip/rarity-filter/hotkey-row design, old widget menu). The fork's interface has since been redesigned (game-native overlay theme, currency icons in trade listings, gamepad navigation highlights, rarity filter), so the docs visually contradict the app users download.

## What Changes

- Recapture all app-UI screenshots embedded in `docs/*.md` (~56 images across 16 pages: index splash, quick-start, features, item-info, item-data, map-check, stash-search, widgets, extra-widgets, xp-tracker, chat-commands, complex-query, faq, private-leagues, no-item-mods, invalid-json) using the fork's current interface.
- Screenshots are generated with a browser harness: renderer + main dev servers (the same port-8584 IPC transport the gamepad repro harness uses), items fed via the item editor, UI states driven and captured via browser automation — no game client or Windows machine needed.
- Replace the imgur-hosted splash on `index.md` with a new-UI screenshot committed to `docs/reference-images/` (fork-hosted asset, consistent with the existing "docs assets resolve within the fork" requirement).
- Add a short `docs/` harness page (mirroring `gamepad-repro-harness.md`) documenting how to regenerate the screenshots, so future UI changes can refresh them.
- Remove `docs/reference-images/` files that are no longer referenced after the swap (stale upstream-UI images); keep image file names stable where the shot's subject is unchanged to minimize markdown diffs.
- No application code changes: renderer/main/dataParser are untouched.

Out of scope: troubleshooting pages whose media show OS/game dialogs rather than app UI (`nothing-happens.md` images and mp4, `failed-load-leagues.md` images — all imgur-hosted), the `safeZoneFormula.svg` diagram (not a UI screenshot), any UI or code changes, renaming/rewriting doc prose beyond captions that no longer match the new UI.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `docs-site`: new requirement that published feature screenshots depict the fork's current interface and are served from fork repository assets (not external image hosts), plus a documented regeneration procedure; existing requirements (deploy, version, download links, header link, fork identity, asset resolution) are unchanged.

## Impact

- **Files**: `docs/*.md` (image references and stale captions only), `docs/reference-images/*` (replaced/removed PNGs, new splash asset), new `docs/screenshot-harness.md`. All under `docs/` — this triggers the Pages deploy workflow on merge.
- **Upstream mergeability**: `docs/` markdown and `docs/reference-images/` are shared with upstream, so replaced images and edited reference lines will surface as future merge conflicts. Conflict surface is kept minimal and localized: binary image files are overwritten in place (same names where possible) and markdown edits are limited to the image lines; no reformatting or restructuring of shared pages. Risk is low — image files rarely conflict semantically.
- **Gamepad feature / Linux**: no effect on app code or the gamepad feature. The harness runs in a plain browser on Linux, which also proves the docs can be refreshed without the Windows-first release tooling. Screenshots themselves are platform-neutral (browser-rendered overlay UI at default config).
