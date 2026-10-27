# Docs screenshot harness

How to recapture the app-UI screenshots embedded in the documentation
(`docs/*.md` → `docs/reference-images/`) with the current interface — in a
plain browser, without the game client, on any platform. Run this after UI
changes so the docs keep depicting the app users download.

## Setup

1. Start the dev harness (same transport the [gamepad repro harness](gamepad-repro-harness) uses):

   ```sh
   cd renderer && npm run make-index-files && npm run dev   # port 5173
   cd main && npm run dev                                   # IPC on 127.0.0.1:8584
   ```

2. Drive a headless Chromium-family browser (system Chrome/Brave via
   `playwright-core`) with:

   - viewport 1920×1080, `deviceScaleFactor: 2` (docs embed 2× PNGs);
   - **user-agent containing `Electron`** — the renderer checks
     `navigator.userAgent.includes("Electron")` and otherwise ignores
     `MAIN->OVERLAY::` events, so the overlay can't be activated;
   - the page `http://localhost:5173/` opened and `#app` initialized.

3. Activate the overlay and guard against the main process's own overlay
   window state (it broadcasts `MAIN->OVERLAY::visibility` when its Electron
   window hides, which suppresses widget rendering in the browser too):

   ```js
   const dynImport = new Function("u", "return import(u)");
   const { MainProcess } = await dynImport("/src/web/background/IPC.ts");
   MainProcess.selfDispatch({ name: "MAIN->OVERLAY::focus-change", payload: { overlay: true, game: false } });
   MainProcess.selfDispatch({ name: "MAIN->OVERLAY::visibility", payload: { isVisible: true } });
   ```

## Mechanics that matter

- **Widget windows are `#widget-<wmId>` elements**, but their outer wrapper
  has a 0-height box; screenshot the first child with a real bounding box
  (or clip to its rect). Widget ids come from
  `AppConfig().widgets.map(w => ({ id: w.wmId, type: w.wmType }))`.
- **Hover controls are icon buttons** (eye-slash = hide, pen = edit,
  arrows = move, trash = delete, shown beside the widget while hovered).
  The "…" popover in the menu opens on **hover** (tippy), not on click.
- **Settings windows** open via the cog button in the menu; they are
  exclusive widgets — close them (X) before opening anything else. Tabs are
  clickable labels; long tabs (Price check) scroll.
- **Items are fed with an IPC event** (the same one the main process sends):

  ```js
  MainProcess.selfDispatch({
    name: "MAIN->CLIENT::item-text",
    payload: { target: "price-check", clipboard: ITEM_TEXT, focusOverlay: true, position: { x: 400, y: 300 } },
  });
  ```

  Item texts must be real game clipboard format (with
  `{ Prefix Modifier "…" (Tier: N) — tags }` info lines, each mod group in
  its own `--------` section, `Note:` in its own section, `Waystone (Tier 16)`
  without a colon). Base names must exist in the current
  `renderer/public/data/en/items.ndjson` — older names like `Expert Heavy
  Crown` no longer parse. The trade search may answer "Retry after N
  seconds" while the rate limiter waits; click **Retry** and continue.

## Per-image state table

| Image | Page(s) | State |
|---|---|---|
| `splash.png` | index | hero: overlay menu + helmet price check with listings, full page |
| `RareCheck.png` | features | price check, rare helmet (`Covert Hood`), Search clicked, listings loaded |
| `UniqueCheck.png` | features | price check, unique (`Temporalis`) |
| `CurrencyCheck.png` | features | price check, `Gemcutter's Prism` (bulk exchange view) |
| `GemCheck.png` | features | price check, `Herald of Thunder`, Search clicked |
| `example-item-2-window.png` | quick-start | price check of the Cataclysm Turn Ruby Ring, two damage filters unticked, Search clicked |
| `example-item-2.png` | quick-start | **kept** (in-game tooltip, not app UI) |
| `no-stats.png` | no-item-mods | price check of a normal ring (no stats) |
| `complex.png` | complex-query | intercept `/proxy/…/trade2/search/` → 400 `{"error":{"message":"Query is too complex for the search."}}`, then Search |
| `tradeButton.png`, `builtin-browser-button.png` | complex-query, private-leagues | crop of the Trade + external-link buttons in a listings window |
| `jsonError.png` | invalid-json | intercept the search endpoint → 200 `text/html` garbage (bot protection), Retry past the rate limiter |
| `ItemInfo2.png` / `ItemInfo.png` | item-info, features | `item-text` with `target:"item-check"`, helmet / crossbow |
| `ItemInfoSettings.png` | item-info, features | settings → Item Info tab |
| `MapCheck.png` | map-check, features | item-check with a magic waystone |
| `MapCheckSettings.png` | map-check, features | settings → Map Check tab |
| `StashSearchAdd.png`, `StopWatchAdd.png` | stash-search, extra-widgets | overlay menu with the "…" popover open (hover) |
| `StashSearchMapRolling.png` | stash-search, features | Map rolling widget shown |
| `MapRollingBurning.png` | stash-search, features | same widget after clicking "Burning Ground" |
| `RollingMain.png` | stash-search | Map rolling widget with a hotkey set on an entry (Keys toggle + badge) |
| `DumpSortWidget.png` / `DumpSortCurrency.png` | stash-search, features | Dump sorting widget / after clicking "Currency" |
| `StashSearchRollingSettings.png`, `StashSearchSettings2.png` | stash-search | pen (edit) on the Map rolling widget → settings editor |
| `StopwatchPaused0.png` | extra-widgets | freshly added stopwatch (menu "…" → Stopwatch) |
| `StopwatchHover.png` | extra-widgets | stopwatch hovered (controls visible) |
| `StopwatchPause.png`, `Stopwatch.png` | extra-widgets, features | running stopwatch (Start clicked, ~1 s) |
| `StopwatchSettings.png` | extra-widgets, features | pen on the stopwatch → settings |
| `StopwatchMove.png` | widgets | stopwatch hovered (move/edit/hide/delete icons) |
| `stopwatchbox.png` | widgets | move mode active (arrows icon clicked, widget follows the cursor) |
| `otherMove.png` | widgets | move mode on the Map rolling widget |
| `WidgetEdit.png` | widgets | Map rolling widget hovered |
| `HideWidget.png` | widgets | Dump sorting widget hovered |
| `hiddenWidget.png` | widgets | stopwatch hidden after being titled — its button shows in the menu |
| `StopwatchDelete.png` | widgets | trash icon held (press-and-hold to confirm) |
| `mainWidget.png` | xp-tracker | overlay menu close-up |
| `XpWidget.png` | xp-tracker | XP menu button clicked (pinned tracker) |
| `LevelingSettings1.png`, `LevelingSettings2.png` | xp-tracker | settings → Leveling tab |
| `ChatMacros.png` | chat-commands, features | settings → Chat tab |
| `overlay-keybind.png` | faq | overlay menu bar close-up |
| `logs.png` | faq | settings → Debug tab |
| `SingleItemRollingUI.png` | item-data | library widget session UI (book icon in menu) |
| `expFeatures.png` | item-data | settings → General tab |
| `libraryWidgetIcon.png` | item-data | overlay menu with the library book icon |
| `editWidget.png` | item-data | library widget (edit via the pen icon beside it) |
| `LibrarySettings.png` | item-data | pen on the library widget → settings |
| `private-league-setting.png` | private-leagues | settings → Price check tab, League section |
| `builtin-browser.png` | private-leagues | Price check tab scrolled to the Enable builtin browser warning |
| `sign-in.png` | private-leagues | **manual capture** — needs the real built-in browser (`webview`), which does not render in a plain browser |
| `mousewheel-zoom.png`, `zoom-keybinds.png` | faq | **kept** (game UI, not app UI) |
| `safeZoneFormula.svg` | xp-tracker | **kept** (diagram) |

## Fallbacks

- `sign-in.png` requires the app's built-in browser (`webview` tag): capture
  it manually from a real app session.
- If the trade API is unreachable, listing-dependent shots
  (`RareCheck`, `GemCheck`, `example-item-2-window`, `splash`) can't be
  captured — rerun when the network to `pathofexile.com` works.
- Wiring config changes through `saveConfig()` writes the real user config
  (`~/.config/exiled-exchange-2/config.json`); if it didn't exist before the
  session, delete it afterwards.
