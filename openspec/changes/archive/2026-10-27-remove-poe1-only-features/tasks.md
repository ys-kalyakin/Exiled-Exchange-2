# Tasks

## 1. Parser model cleanup (renderer/src/parser)

- [x] 1.1 Remove `ItemCategory.Heist*` entries (Blueprint, Contract, Tool, Brooch, Gear, Cloak) from `meta.ts` and prune their uses in the meta sets; verify `npm run check-types` in renderer reports no remaining references
- [x] 1.2 Remove `item.heist` from `ParsedItem.ts` and `parseHeistBlueprint` (and its registration) from `Parser.ts`; keep `AREA_LEVEL`, `parseAreaLevelNested`, and the PoE2 trials branch (Djinn Barya, Inscribed Ultimatum); verify via parser test run
- [x] 1.3 Remove blighted-map handling: the `MAP_BLIGHTED`/`MAP_BLIGHT_RAVAGED` name stripping in `Parser.ts`, `parseBlightedMap` and its registration, and `item.mapBlighted` from `ParsedItem.ts`; verify with grep that `mapBlighted` has no references left
- [x] 1.4 Remove PoE1-only parsing branches: `parseAreaLevel` (Chronicle of Atzoatl, Expedition Logbook, Mirrored Tablet, Forbidden Tome), `parseAtzoatlRooms`, and the `IncursionRoom` enum; keep the shared area-level helper; verify via parser test run
- [x] 1.5 Update `renderer/specs/Parser/` fixtures: drop heist/blighted/PoE1-item examples, add one case asserting a heist blueprint yields no heist structured data; verify `cd renderer && npm run test` passes

## 2. Price-check filters, trade mapping, and heist UI branches

- [x] 2.1 Remove heist branches from `create-presets.ts` and `create-item-filters.ts` (heist blueprint/contract presets, `heistWingsRevealed` filter, category exclusions); remove `heistWingsRevealed` from `filters/interfaces.ts` and the `FiltersBlock.vue` block that renders it; verify renderer type-check passes
- [x] 2.2 Remove the `FilterTag.Delve` (`DELVE_MODS`) and `FilterTag.Incursion` (`INCURSION_MODS`) assignments in `create-stat-filters.ts` and their tag badges in `FilterModifier.vue`; drop unused tag enum entries; verify `cd renderer && npm run test -- create-item-filters create-stat-filters` passes (update the tests in `renderer/specs/web/price-check/filters/` accordingly)
- [x] 2.3 Remove heist entries from `pathofexile-trade.ts`: the six `ItemCategory.Heist*` trade-category mappings and the `HeistWings`/`HeistJob*`/`HeistContractObjective` static options; verify with `cd renderer && npm run test -- pathofexile-trade` (update `renderer/specs/web/price-check/trade/` expectations)
- [x] 2.4 Remove the heist special cases from `PriceCheckWindow.vue`, `CheckedItem.vue`, and `WidgetItemCheck.vue`; verify renderer type-check passes and a non-heist item still renders the price-check flow (manual overlay check or existing component tests)

## 3. Map-check heist tagging

- [x] 3.1 Remove `StatTag.HeistExclusive` and the `fromHeistAreaMods`/`fromUberAreaMods` flags from `assets/data/interfaces.ts`, the tag logic in `map-check/settings-maps.vue`, and the tag UI + CSS in `map-check/SettingsMatcherEntry.vue`; verify renderer type-check passes
- [x] 3.2 Remove the `map.mods.heist` i18n key from all locale files under `renderer/public/data/*/app_i18n.json`; verify `grep -ri heist renderer/public/data` returns no matches

## 4. Overlay widgets and config

- [x] 4.1 Remove the Delve Grid widget: `WidgetDelveGrid.vue`, `DelveGridWidget` from `overlay/widgets.ts`, its registry entry, the `delve-grid` shortcut push and `delveGridKey` migration code in `Config.ts`, its `hotkeys.vue` settings entry, and its entries in `overlay/gamepad/config.ts`; verify no `delve-grid` references remain (`grep -rn delve renderer/src`)
- [x] 4.2 Remove the Image Strip widget: `WidgetImageStrip.vue`, `ImageStripWidget`, its registry entry, both `image-strip` migration sites in `Config.ts`, and delete `renderer/public/images/syndicate.jpg`; keep `FullscreenImage.vue` (used by MapCheck); verify `grep -rn image-strip renderer/src` is clean
- [x] 4.3 Bump `configVersion` to 28 and add a migration that filters `delve-grid` and `image-strip` entries out of `config.widgets` (same pattern as the `filter-generator` removal); add a Config unit/spec test proving a pre-28 config loads without those widgets; verify `cd renderer && npm run test -- Config` passes
- [x] 4.4 Remove the heist-gems default hotkey entry from the default config in `Config.ts`; verify the defaults object no longer references `ocr-text`/`heist-gems` (`grep -rn heist renderer/src/web/Config.ts`)

## 5. Main process: vision OCR subsystem removal

- [x] 5.1 Delete `main/src/vision/` (HeistGemFinder.ts, link-main.ts, link-worker.ts, wasm-bindings.ts, utils.ts) and remove the `ocr-text` dispatch, `OcrWorker` creation/lifecycle, and `updateOptions` call from `main/src/shortcuts/Shortcuts.ts`; verify `cd main && npm run check-types` passes
- [x] 5.2 Remove the `comlink` and `@wokwi/bmp-ts` devDependencies from `main/package.json` (and any esbuild externals referencing them) and run `npm i` in main; verify `cd main && npm run lint && npm run check-types` passes
- [x] 5.3 Remove the heist-gems OCR consumer from `renderer/src/web/item-search/WidgetItemSearch.vue` (the `MAIN->CLIENT::ocr-text` listener, `fuzzyFindHeistGem`, and the `:heist_target` label if heist-only); verify renderer type-check passes and the widget still searches by name/starred items

## 6. dataParser and data interfaces

- [x] 6.1 Remove `HEIST_*`, `MAP_BLIGHTED`, `MAP_BLIGHT_RAVAGED`, `DELVE_MODS`, and `INCURSION_MODS` entries from `dataParser/src/constants/client_string_data.py` and the matching fields from `renderer/src/assets/data/interfaces.ts`; verify `cd dataParser && pytest` passes and renderer type-check passes
- [x] 6.2 Trim `heist_equipment_stat_descriptions.csd` from `dataParser/src/constants/filenames.py` if unused elsewhere; verify `cd dataParser && pytest` passes
- [x] 6.3 (Follow-up, non-gating) Run `python ./src/main.py` in dataParser to regenerate `renderer/public/data/*` so `client_strings.js` drops the removed keys; if game data sources are unavailable in this environment, record that the regeneration is deferred and verify the app tolerates the stale extra keys (type-check + manual overlay smoke test)

## 7. Final sweep and integration verification

- [x] 7.1 Leftover sweep: `grep -rni 'heist\|syndicate\|betrayal' main/src renderer/src dataParser/src` and `grep -rni 'delve\|blight\|incursion\|ocr\|image-strip' main/src renderer/src` return no functional references (docs/comment hits in this change's own artifacts are fine); update `docs/faq.md` if it advertises removed features
- [x] 7.2 Full renderer verification: `cd renderer && npm run lint && npm run check-types && npm run test`
- [x] 7.3 Full main verification: `cd main && npm run lint && npm run check-types`
- [ ] 7.4 Manual smoke test (two-shell dev setup): price-check a rare weapon, open the widget menu (no Delve Grid or Cheat sheets entries), confirm settings hotkey page renders without delve/heist rows, and confirm a saved pre-existing config loads without errors

## Workflow follow-up

- Run `openspec validate --specs --strict` before committing spec changes
- Archive the change with `/opsx:archive remove-poe1-only-features` after implementation and sync specs
- At the next upstream sync, budget for conflict resolution in `Parser.ts`, `Config.ts`, `Shortcuts.ts`, and the filters/trade files (documented in proposal.md)
