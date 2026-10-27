# Proposal

## Why

The game-native theme rework (commit `8114c7a2`) and the fork's gamepad settings column introduced a handful of small visual defects the user actually sees in daily use: the numeric filter chips in the price check window render their label flush against the value/threshold editor (reported on the Item Level chip), listings priced in Orb of Alchemy or Mirror of Kalandra show no currency icon in the trade results, and in the settings hotkeys tab the split Ctrl/Alt + key control overflows its column onto the gamepad combo control of the same row. Individually minor, together they make the overlay feel unpolished, so they should be swept in one pass.

## What Changes

- Restore visual separation inside numeric filter chips (`renderer/src/web/price-check/filters/FilterBtnNumeric.vue`): the label button, the natural-value readout (disabled state) and the threshold editor (enabled state) get a small, consistent gap instead of touching — matching the spacing of the logical chips.
- Add the missing currency art for the two reported currencies and reserve it in the trade-results price icon slot: `Orb of Alchemy` (trade id `alch`) and `Mirror of Kalandra` (trade id `mirror`) in `TradeItem.vue`, with the icon PNGs committed under `renderer/public/images/` the same way `aug.png`/`regal.png`/`transmute.png` were.
- Fix the settings hotkeys row layout (`renderer/src/web/settings/SettingsHotkey.vue`): the keyboard binding column (including the Ctrl/Alt + key split control) sizes so it no longer overflows into the gamepad combo column; keyboard and gamepad columns stay aligned across all hotkey rows.
- Visual audit of the remaining tabs and panels (settings: general, chat, gamepad, debug, help, about, price-check settings; price check: preset tabs, filter rows, results table, bulk exchange, item editor popover; item check widget) for defects of the same classes — overlapping/clipped controls and missing currency icons — with same-class fixes where found.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `price-check`: the "Filter editing and item editor" requirement is extended — numeric filter chips must keep label and value/threshold editor visually separated (no overlap), and the trade-listing price icon slot must carry art for the common asking-price currencies, explicitly including Orb of Alchemy and Mirror of Kalandra (previously an empty slot).
- `shortcut-hotkeys`: new requirement covering the renderer settings hotkey row layout — the keyboard binding column and the gamepad combo column of a row must not overlap and must stay column-aligned across rows (the gamepad column is fork-specific, so this requirement lives beside the existing gamepad capture requirement).

## Impact

- Renderer only: `FilterBtnNumeric.vue`, `TradeItem.vue`, `SettingsHotkey.vue`, new PNG assets under `renderer/public/images/`, plus whatever the audit pass touches in sibling Vue components (CSS/template layout only). No main-process, config-migration, or dataParser changes.
- Upstream mergeability: `FilterBtnNumeric.vue` and `TradeItem.vue` already carry fork-specific edits (theme rework `8114c7a2`, currency icon slot); `SettingsHotkey.vue` already carries the fork-only gamepad column. The changes are small, localized CSS/template edits in those already-divergent spots, so future upstream merges are not made harder. No upstream files are reformatted.
- Gamepad feature: the `SettingsHotkey.vue` fix must preserve the gamepad combo input and its capture flow exactly (the fork's feature keeps compiling and working); no other gamepad behavior is touched.
- Linux (X11) support: unaffected — pure renderer layout/asset work.

## Out of Scope

- Theme redesign, new widget features, or non-visual (behavioral) changes.
- A generic runtime currency-icon fallback resolved from the item database (`TRADE_TAG_TO_REF` + item icon URLs) — considered in design and deferred; this change only adds the two reported icons via committed art, as with the existing set.
- The stray untracked backup file `renderer/src/web/price-check/PriceCheckWindow.vue.b2`: deleting it is repo hygiene, not a visual bug; left out of this change.
- Icons for every possible trade currency beyond the two reported (and any the audit finds trivially fixable with the same mechanism).
