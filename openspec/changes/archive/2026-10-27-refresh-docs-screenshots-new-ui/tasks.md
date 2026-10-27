# Tasks

## 1. Harness setup and capture procedure

- [x] 1.1 Build the per-image state table (page → image file → exact UI state/actions that reproduce it) from the current docs pages, covering all 56 referenced `reference-images/` files plus the index splash; keep it as the working checklist for the capture run. Verify: the table lists every image referenced by `docs/*.md` (cross-check with a grep of `/reference-images/` links)
- [x] 1.2 Start the harness: `cd renderer && npm run make-index-files && npm run dev` plus `cd main && npm run dev` (IPC on 127.0.0.1:8584), open `http://localhost:5173/` in the automation browser and activate the overlay (focus-change event per `docs/gamepad-repro-harness.md`). Verify: the overlay and widget menu render in the browser and the config loads over the real IPC
- [x] 1.3 Define the capture profile — browser viewport, dark neutral backdrop (overlay background), deviceScaleFactor 2, element screenshot of the widget window — and validate it on one sample shot. Verify: the sample PNG is crisp, shows the current theme, and drops into a docs page unchanged

## 2. Recapture and swap images (per page groups)

- [x] 2.1 Replace the imgur splash: capture the new `docs/reference-images/splash.png` and update the `index.md` image line. Verify: `index.md` renders the fork-hosted splash and no imgur URL remains on the page
- [x] 2.2 Recapture quick-start + feature shots (`quick-start.md`, `features.md`: price check windows for rare/unique/currency/gem, map check, item info, stash search, stopwatch, chat macros) and overwrite the referenced files in place. Verify: each page's images render and depict the current UI (rarity filter chips, hotkey row, game-native theme)
- [x] 2.3 Recapture listing-dependent shots last, with the trade API reachable (complex query, trade button, pricing examples). Verify: listings render real current-UI result rows; if the API is unreachable, retry before falling back per the harness page
- [x] 2.4 Recapture item-info + item-data shots (`item-info.md`, `item-data.md`: item info windows, library/settings UI, widget edit). Verify: pages render current-UI images
- [x] 2.5 Recapture map-check + stash-search shots (`map-check.md`, `stash-search.md`: map check window/settings, stash search widgets and rolling UI). Verify: pages render current-UI images
- [x] 2.6 Recapture widgets + extra-widgets + xp-tracker shots (`widgets.md`, `extra-widgets.md`, `xp-tracker.md`: move/edit/hide/delete flows, stopwatch states, leveling settings, main overlay, XP widget). Verify: pages render current-UI images
- [x] 2.7 Recapture remaining shots (`chat-commands.md`, `faq.md`, `no-item-mods.md`, `invalid-json.md`); for `private-leagues.md` apply the webview fallback from the design if built-in-browser content will not render, capturing the app-chrome states normally. Verify: pages render current-UI images and the fallback decision is recorded in the harness page
- [x] 2.8 Delete orphaned stale-UI PNG/SVG files in `docs/reference-images/` (keep upstream `.pdn` sources). Verify: the orphan cross-check lists nothing unreferenced except `.pdn` sources

## 3. Harness documentation

- [x] 3.1 Write `docs/screenshot-harness.md`: dev-server startup, overlay activation, capture profile, the per-image state table from task 1.1, and the fallback/retry procedures (webview shots, trade-API retries). Verify: a fresh shell following only this page can reproduce any listed screenshot

## 4. Verification

- [x] 4.1 Link integrity: every `/reference-images/` path referenced by `docs/*.md` resolves to an existing file, and no `docs` page still references imgur for app-UI images. Verify: cross-check command output is clean
- [x] 4.2 Docs build: `cd docs && npm install && npm run build` succeeds and spot-check rendered pages show the new images. Verify: VitePress build exits 0
- [x] 4.3 Confirm the change is docs-only and the app is untouched: `git status` shows changes only under `docs/` (plus this change's OpenSpec dir), and the per-package checks pass — `cd renderer && npm run lint && npm run check-types && npm run test` and `cd main && npm run lint && npm run check-types`. Verify: all commands exit 0

## Workflow follow-up

- Review the rendered pages, then commit and push so the Pages workflow deploys the refreshed site.
- Archive the change per the project's OpenSpec workflow once reviewed.
