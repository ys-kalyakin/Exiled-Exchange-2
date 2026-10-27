# Proposal: Remove PoE1-only features

## Why

Exiled Exchange 2 is a PoE2 tool, but it still ships functionality inherited from its Awakened PoE Trade lineage that has no equivalent in Path of Exile 2: the Heist Gem Finder (a Windows-only OCR subsystem), the Delve Grid overlay widget, the Image Strip "cheat sheets" widget whose bundled use is the PoE1 Immortal Syndicate board, Heist item price-checking, Blighted-map handling, Delve/Incursion filter tags, and parsers for PoE1-only items (Incursion Chronicle of Atzoatl, Expedition Logbooks, Mirrored Tablets, Forbidden Tomes). This is dead weight: it confuses users (visible widgets and hotkeys for mechanics that do not exist in PoE2), enlarges the surface that must be maintained and translated, and drags runtime assets (Tesseract/OpenCV WASM) into the packaging. The user explicitly asked to clean out PoE1-only functionality, naming Heist and Syndicate as examples.

## What Changes

- **BREAKING** Remove the Heist Gem Finder feature and the whole `main/src/vision/` OCR subsystem: `HeistGemFinder`, the comlink worker plumbing (`link-main.ts`, `link-worker.ts`, `utils.ts`, `wasm-bindings.ts`), the `ocr-text` shortcut action type and its default hotkey, the heist-gems handling in `WidgetItemSearch.vue`, and the runtime OCR assets (`heist-lock.bmp`, Tesseract/OpenCV WASM bundles).
- **BREAKING** Remove the Delve Grid overlay widget (`WidgetDelveGrid.vue`, its widget interface, registry entry, default config entry, `delveGridKey` config migration, hotkeys settings entry, and `delve-grid` shortcut action).
- **BREAKING** Remove the Image Strip overlay widget (`WidgetImageStrip.vue`, its interface, registry entry, default config entry, and the bundled `syndicate.jpg` cheat-sheet image). Assumption: the widget exists only as a PoE1 cheat-sheet viewer; arbitrary custom image display is intentionally sacrificed.
- Remove Heist item parsing and price-checking: `ItemCategory.Heist*` categories, `parseHeistBlueprint` and the `item.heist` model, the `heistWingsRevealed` filter, heist branches in presets/item-filters/stat-filters, heist trade API category and static mappings, heist branches in `PriceCheckWindow.vue` / `CheckedItem.vue` / `WidgetItemCheck.vue`, and the `HEIST_*` client strings from `dataParser`.
- Remove Blighted-map parsing: `MAP_BLIGHTED` / `MAP_BLIGHT_RAVAGED` regexes, `parseBlightedMap`, `item.mapBlighted`, and its use in the price-trend details id.
- Remove PoE1-only item parsing branches: `parseAreaLevel` callers for PoE1 items (Chronicle of Atzoatl, Expedition Logbook, Mirrored Tablet, Forbidden Tome), `parseAtzoatlRooms` (Incursion rooms), and the `INCURSION_*` client strings. Area-level parsing for PoE2 trial items (Djinn Barya, Inscribed Ultimatum) is kept.
- Remove Delve/Incursion filter tags (`FilterTag.Delve` via `DELVE_MODS`, `FilterTag.Incursion` via `INCURSION_MODS`) and the `DELVE_MODS`/`INCURSION_MODS` client strings, plus their UI badges in `FilterModifier.vue`.
- Remove the Heist-exclusive tagging from map/item check (`StatTag.HeistExclusive`, `fromHeistAreaMods`/`fromUberAreaMods` data flags, the `map.mods.heist` tag UI and i18n entry). The map check feature itself stays — it is used for PoE2 waystones.
- Update parser/price-check test fixtures that reference heist, blighted, or PoE1-only items.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vision-ocr`: The whole capability (OCR worker lifecycle, heist gems recognition, platform guard) is removed along with `main/src/vision/`.
- `shortcut-hotkeys`: The "Action dispatch by type" requirement loses the `ocr-text` action type (heist gems); all other dispatch targets stay.
- `item-parsing`: Adds a requirement that PoE1-only item content (heist blueprints/contracts, blighted maps, incursion rooms, PoE1 area-level items) is not parsed into PoE1-specific structured data, while PoE2 trial area levels keep parsing.
- `price-check`: Adds a requirement that price check exposes no PoE1-only filter mechanics (heist wings filter, delve/incursion tags, heist-exclusive map-mod tags) and that PoE1-only items fall back to the unsupported-item view.

## Impact

- **Code**: `main/src/vision/` (deleted), `main/src/shortcuts/Shortcuts.ts`, `main/package.json` (`@wokwi/bmp-ts` dependency), `renderer/src/parser/` (`Parser.ts`, `meta.ts`, `ParsedItem.ts`), `renderer/src/web/` (Config, overlay widgets and registry, settings hotkeys, price-check filters, trade layer, map-check, item-check, item-search), `renderer/src/assets/data/interfaces.ts`, `dataParser/src/constants/` (client strings), i18n files, and the `renderer/specs/` test suites for touched modules.
- **Upstream mergeability**: All touched files except the fork-specific gamepad annotations are shared with upstream `Kvan7/Exiled-Exchange-2`. Whole-file deletions and narrowed branches in shared files (Parser, Config, Shortcuts, filters) will conflict with future upstream edits; expect manual merge work on these files at the next upstream sync. The fork must keep its localized gamepad edits (`gamepadCombo` comments, `useGamepadWidgetScope` calls) intact where surrounding code is deleted.
- **Gamepad feature**: The Delve Grid widget's `gamepadHotkey` setting and its gamepad-config entries are removed; the gamepad system itself (widget navigation, B-button back chain, price-check combos) is unaffected. No gamepad behavior is added or changed otherwise.
- **Linux support**: Net positive — the Heist Gem Finder was Windows-only (explicit non-Windows guard); removing it deletes a Windows-only path. OCR WASM assets no longer need packaging consideration on any platform.
- **Data pipeline**: `dataParser` stops emitting `HEIST_*`, `MAP_BLIGHTED*`, `DELVE_MODS`, and `INCURSION_MODS` client strings; a data regeneration run is required so `client_strings.js` no longer carries them. The Blight oils computation in `value_converter_service.py` is left untouched (see out of scope).
- **Users**: Configs saved by older versions may still contain `delve-grid`/`image-strip` widget entries and `heist`/`delve` hotkeys; the config loader must tolerate unknown widget types and stale keys without breaking (existing unknown-widget handling is verified in design).

### Out of scope

- poe.ninja price trends (PoE2 economy exists on poe.ninja; the feature stays).
- Map/item check itself (used for PoE2 waystones) — only the Heist-exclusive tagging is removed.
- Dead `ItemCategory` enum entries that merely never match in PoE2 data (Captured Beast, Metamorph Sample, Sentinel, Memory Line, etc.) — removing them safely requires per-item verification against the PoE2 data set and is deferred.
- The Blight oils computation in `dataParser` (`matcher["oils"]`) — harmless data-driven code, removed later if confirmed dead.
- Stripping already-generated data files by hand instead of regenerating them via `dataParser`.
