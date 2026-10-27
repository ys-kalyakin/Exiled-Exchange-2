# Design: Remove PoE1-only features

## Context

The app carries PoE1-only functionality inherited from Awakened PoE Trade (see proposal.md — Why). Verified locations:

- **Heist Gem Finder**: `main/src/vision/` (HeistGemFinder, comlink worker `link-main`/`link-worker`, WASM bindings for Tesseract/OpenCV, `utils.ts`), wired through `main/src/shortcuts/Shortcuts.ts` (action type `ocr-text`, target `heist-gems`, `OcrWorker` lifecycle + language updates), the default hotkey in `renderer/src/web/Config.ts`, and the OCR-result consumer in `renderer/src/web/item-search/WidgetItemSearch.vue` (`MAIN->CLIENT::ocr-text` listener, `fuzzyFindHeistGem`). Runtime assets (`tesseract-core-simd.js`, `opencv.js`, `heist-lock.bmp`) live in `userData/apt-data/cv-ocr`, provisioned outside the repo; the shared `apt-data` directory is also used by ConfigStore/FileWriter/file-uploads/AppTray and stays.
- **Delve Grid widget**: `WidgetDelveGrid.vue`, `DelveGridWidget` in `overlay/widgets.ts`, registry entry, default widget entry and `delveGridKey` migration + `delve-grid` shortcut push in `Config.ts`, settings entry in `settings/hotkeys.vue`, gamepad entries in `overlay/gamepad/config.ts`.
- **Image Strip widget**: `WidgetImageStrip.vue`, `ImageStripWidget`, registry entry, `image-strip` handling in `Config.ts` (two migration sites), bundled `renderer/public/images/syndicate.jpg`. Its fullscreen viewer `FullscreenImage.vue` is shared with `MapCheck.vue` and stays.
- **Heist item pipeline**: `ItemCategory.Heist*` in `parser/meta.ts`, `item.heist` in `ParsedItem.ts`, `parseHeistBlueprint` in `Parser.ts`, `HEIST_*` client strings (dataParser + `assets/data/interfaces.ts`), heist branches in `create-presets.ts`, `create-item-filters.ts`, `create-stat-filters.ts`, `pathofexile-trade.ts` (category map + `HeistWings`/`HeistJob*` static options), UI branches in `PriceCheckWindow.vue`, `CheckedItem.vue`, `WidgetItemCheck.vue`, `FiltersBlock.vue`, i18n key `item.heist_wings_revealed`.
- **Blighted maps**: `MAP_BLIGHTED`/`MAP_BLIGHT_RAVAGED` regexes (dataParser + interfaces), regex strip + `parseBlightedMap` in `Parser.ts`, `item.mapBlighted`, `getDetailsId` map variant.
- **PoE1 item branches**: `parseAreaLevel` (PoE1 callers: Chronicle of Atzoatl, Expedition Logbook, Mirrored Tablet, Forbidden Tome), `parseAtzoatlRooms` + `IncursionRoom` + `INCURSION_*` strings. **`parseAreaLevelNested` and the `AREA_LEVEL` string are shared with the PoE2 trials parser (Djinn Barya, Inscribed Ultimatum) and must survive.**
- **Delve/Incursion filter tags**: `FilterTag.Delve` (`DELVE_MODS`) and `FilterTag.Incursion` (`INCURSION_MODS`) branches in `create-stat-filters.ts` + badges in `FilterModifier.vue`.
- **Map-check heist tagging**: `StatTag.HeistExclusive`, `fromHeistAreaMods`/`fromUberAreaMods` (interfaces + `settings-maps.vue` logic + `SettingsMatcherEntry.vue` tag UI + i18n `map.mods.heist`). Neither flag has a writer anywhere in the repo — they are dead APT-lineage fields; no data regeneration is needed for them.
- **Precedent for config cleanup**: `Config.ts` already removes dead widgets by versioned migration (e.g. `filter-generator` filtered out at configVersion 26, current version 27). `OverlayWindow.vue` renders `registry.getWidgetComponent(wmType)` directly, so unknown widget types must not survive in saved configs.

## Goals / Non-Goals

**Goals:**
- Delete the PoE1-only features and their plumbing completely, keeping the codebase type-check-clean and the test suite green.
- Keep saved user configs loadable: strip removed widget types and stale actions via a config-version migration.
- Keep the fork's gamepad annotations (`gamepadCombo`, `useGamepadWidgetScope`) intact wherever surrounding code is removed.

**Non-Goals:**
- No replacement features; no deprecation flags or "hidden" modes — code is deleted outright.
- No changes to poe.ninja trends, map check itself, or the trade/exchange query flow beyond deleting heist entries.
- No hand-editing of generated data files (`renderer/public/data/*`); regeneration happens through the dataParser pipeline.

## Decisions

1. **Delete, don't disable.** The features have no PoE2 audience and no plausible PoE2 future; keeping them behind a flag preserves all maintenance and translation burden. Alternative (config toggle) rejected.
2. **Remove the vision subsystem as a unit.** Delete `main/src/vision/` entirely (all five files serve the heist gems finder), drop the `comlink` and `@wokwi/bmp-ts` devDependencies (used only there), and remove the `ocr-text` action type from `Shortcuts.ts` including `OcrWorker` creation and `updateOptions`. The `apt-data` user-data directory and its other consumers stay; the orphaned `cv-ocr` folder on users' disks is left alone (no destructive cleanup). Rationale: a dead OCR stack with WASM runtime assets is the single largest maintenance liability in this cleanup. Alternative (keep vision for future PoE2 screen recognition) rejected — YAGNI, and the spec capability is removed.
3. **Config cleanup follows the existing migration pattern.** Bump `configVersion` to 28 and filter `delve-grid` and `image-strip` entries from `config.widgets` (same shape as the `filter-generator` removal), and drop the heist-gems default hotkey from the defaults object. Without the migration, saved configs would render `undefined` Vue components in the overlay. Widget entries removed this way are unrecoverable on rollback — accepted, documented as breaking.
4. **Parser surgery keeps PoE2 paths intact.** Remove only the PoE1-only functions and registrations (`parseHeistBlueprint`, `parseBlightedMap`, blighted-name stripping, `parseAreaLevel`, `parseAtzoatlRooms`); keep `parseAreaLevelNested`, `AREA_LEVEL`, and the PoE2 trials branch. Remove `ItemCategory.Heist*` (they have dedicated code paths everywhere) but leave other never-matching categories (Captured Beast, Sentinel, …) for the deferred dead-code sweep — removing them safely requires verifying PoE2 data set contents item by item.
5. **dataParser: trim client strings, defer regeneration.** Remove `HEIST_*`, `MAP_BLIGHTED`, `MAP_BLIGHT_RAVAGED`, `DELVE_MODS`, `INCURSION_MODS` from `client_string_data.py` and the matching entries from `assets/data/interfaces.ts`. Generated `client_strings.js` files keep carrying the removed keys until the next pipeline run; extra runtime keys are harmless because `CLIENT_STRINGS` is typed by the hand-written interfaces. Regeneration (`dataParser/src/main.py`) is listed as a follow-up task, not a gate — it needs the game data sources and does not affect behavior.
6. **Tests: prune fixtures, keep the regression contract.** Remove heist/blighted/PoE1-item fixtures from `renderer/specs/`; add one negative case asserting PoE1-only item text (heist blueprint) does not produce heist structured data, matching the new item-parsing requirement.

## Risks / Trade-offs

- [Upstream merge conflicts in shared files (Parser.ts, Config.ts, Shortcuts.ts, filters, trade layer)] → Keep deletions surgical (no reformatting), keep fork gamepad annotations, expect and budget for manual conflict resolution at the next upstream sync; the proposal documents this cost.
- [Users lose delve-grid/image-strip widget configs and custom cheat-sheet images] → Breaking by intent; the migration filters entries cleanly instead of leaving broken overlay rendering.
- [Hidden references to removed exports surface late] → `vue-tsc`/`tsc` type checks plus the full Vitest suite are the merge gate; grep sweep tasks cover `heist`, `delve`, `blight`, `incursion`, `ocr`, `image-strip` before completion.
- [Stale generated data keys (client_strings.js) and stale i18n keys in non-English locales] → Harmless extra keys at runtime; i18n cleanup covers all locale files via grep, data regeneration documented as follow-up.
- [Shortcuts.ts constructor wiring breaks when OcrWorker is removed] → The worker is created/lifecycle-managed only inside Shortcuts.ts; removal is a contained edit verified by main type-check.

## Migration Plan

1. Implement in dependency order: parser/model first, then filters/trade, then widgets/config, then main-process vision/shortcuts, then dataParser and i18n.
2. Config migration at `configVersion 28` strips removed widget types; defaults no longer contain them.
3. No data-format changes beyond the widget filtering; rollback is a git revert (deleted widget entries are not restored — accepted).
4. Data regeneration via dataParser is a documented follow-up, not part of the deploy.

## Open Questions

None.
