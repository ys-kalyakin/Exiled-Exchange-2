# Design

## Context

Current state of the docs images:

- 56 unique images under `docs/reference-images/` are referenced by 15 pages (`chat-commands`, `complex-query`, `item-info`, `extra-widgets`, `item-data`, `faq`, `features`, `no-item-mods`, `quick-start`, `invalid-json`, `stash-search`, `map-check`, `private-leagues`, `widgets`, `xp-tracker`); the `index.md` splash is imgur-hosted. 17 additional files in `reference-images/` are unreferenced (including the `.pdn` authoring sources).
- The fork's UI has diverged from those images: game-native overlay theme (`overlay-theme` spec), redesigned price check (rarity filter chips, alch/mirror icons, hotkey row), gamepad navigation focus rings.
- The repo already has a browser-only dev harness precedent: `docs/gamepad-repro-harness.md` + `docs/gamepad-repro-backend.cjs`. The Vite dev server proxies `/config`, `/uploads`, `/proxy` and the `/events` WebSocket to `127.0.0.1:8584`, and `main/src/server.ts` binds the same port in dev when `VITE_DEV_SERVER_URL` is set — so running the real main process next to the renderer dev server gives the full app (IPC, config, web-proxy) in a plain browser.
- The web dev mode ships an item editor (`renderer/src/web/price-check/item-editor/ItemEditorV2.vue` via `DevWidget`) for feeding fake/pasted items into the overlay.

## Goals / Non-Goals

**Goals:**

- A repeatable capture procedure (documented in `docs/`) that produces current-UI screenshots for every app-UI image in the docs, on Linux, without the game client.
- Minimal diff in shared `docs/*.md` and `reference-images/` to keep future upstream merges cheap.
- Consistent look across captures (same backdrop, scale, default config).

**Non-Goals:**

- Any change to app code, config defaults, or docs prose beyond image lines and captions that no longer match the UI.
- Replacing media that shows OS/game dialogs (`nothing-happens.md`, `failed-load-leagues.md`) or the `safeZoneFormula.svg` diagram.
- Automating screenshot diffing or CI enforcement of screenshot freshness.

## Decisions

1. **Capture through the real dev harness (main + renderer), not the fake backend or the packaged app.**
   Running `cd renderer && npm run make-index-files && npm run dev` + `cd main && npm run dev` gives the true app in a browser: config IPC, and — critically — the web-proxy for real trade-site queries, which the `gamepad-repro-backend.cjs` fake backend cannot serve. Item states are fed with the existing item editor; UI states (overlay active, widgets shown) are driven the same way the gamepad harness does (config via `/config-set`, events via `/inject` or real main IPC). Alternative considered: manual screenshots from a real Windows gaming session — rejected as unreproducible and not Linux-doable; fake-backend-only — rejected because price-check listing shots need the real proxy.

2. **Overwrite images in place, keeping existing filenames when the subject is unchanged.**
   Markdown keeps referencing `/reference-images/RareCheck.png` etc.; only binary content (and genuinely new assets like the splash) change. This confines upstream merge friction to binary blobs instead of touch-tension in shared markdown. Renames only where the old name no longer fits (e.g., `splash` moving from imgur to `reference-images/splash.png`).

3. **Uniform capture profile: element screenshot of the widget window, dark neutral backdrop, deviceScaleFactor 2.**
   The overlay renders over the browser page background; set a dark backdrop (mirroring the in-game look, e.g. via `overlayBackground`) and capture the widget's bounding box at 2× for crispness in the VitePress layout. One pass config (browser viewport, backdrop, scale) recorded in the harness page so future refreshes match.

4. **Per-image state table as the source of truth.**
   The harness page will contain a table: page → image → the exact state/actions that produce it (e.g. `features.md / RareCheck.png` — rare body armour via item editor, default filters expanded). The capture run walks this table; the apply tasks reference it rather than embedding the mapping in the task list.

5. **Orphan cleanup limited to stale UI PNGs.**
   Delete unreferenced legacy-UI PNG/SVG files after the swap; keep the upstream `.pdn` authoring sources (not screenshots, and removing them would only add upstream-conflict surface).

6. **Webview-dependent shots get a defined fallback.**
   `private-leagues.md` shows the built-in browser (a `webview` tag that renders nothing in a plain browser). Capture the surrounding app chrome states normally; if the webview content itself cannot render, fall back to loading the same page in an iframe-backed capture or mark those two images (`builtin-browser-button.png`, `sign-in.png`) for a manual capture pass, documented in the harness page.

## Risks / Trade-offs

- [Trade-site API unreachable or rate-limited during capture] → Capture listing-dependent shots (features, complex-query, quick-start pricing) last and retry; harness page documents rerun steps. Non-listing states are unaffected.
- [`webview` content not renderable in a plain browser] → Fallback per Decision 6; worst case two images stay for a short manual pass.
- [Screenshots drift again as the UI evolves] → Harness page + docs-site spec requirement make the refresh procedure discoverable; each future UI change can re-run one documented pass.
- [Upstream merge conflicts in `reference-images/`] → Accepted and minimized (same filenames, no markdown restructuring); binary conflicts resolve by taking the fork's file.
- [Linux-rendered fonts/scrollbars differ subtly from the old Windows-captured images] → Accepted; the UI is the same web renderer users see, and consistency within the docs matters more than matching the old shots.

## Migration Plan

Single docs commit (or a few per-page commits) touching `docs/` — merging deploys the site via the existing Pages workflow. Rollback is `git revert`; the old images remain in git history. No data migration.

## Open Questions

None that change the approach: the exact per-image state list is produced during apply from the current pages and recorded in the harness page.
