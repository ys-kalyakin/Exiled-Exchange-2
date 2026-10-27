# Proposal

## Why

When price-checking, the trade query's rarity constraint is not derived from the item's own rarity: a Magic (blue) item searched from the default "Pseudo" preset is queried with the `nonunique` option, and the rarity chip in the filter panel is read-only. Magic items with a single T1 affix are prime crafting bases that sell for large amounts, but their listings are mixed with rare/normal listings, so the cheapest listed price does not reflect the magic-base market. The user needs the search to account for the item's rarity, with the ability to disable that rarity filter (globally via a setting, and per-search via the filter chip).

## What Changes

- Add a per-widget setting `rarityFilter` (`"match" | "nonunique" | "off"`, default `"match"`) to the price-check widget configuration:
  - `"match"` — the trade query is restricted to the item's own rarity: Normal → `normal`, Magic → `magic`, Rare → `rare`.
  - `"nonunique"` — current behavior: Normal/Magic/Rare items are queried with `nonunique` (exact presets keep exact rarity values).
  - `"off"` — no rarity option is sent to the trade API.
- Make the rarity chip in the filter panel interactive (click toggles the filter on/off for the current search) instead of read-only; the chip shows the active rarity value (`Normal` / `Magic` / `Rare` / `Non-unique`).
- Extend `ItemFilters.rarity` with a `disabled` flag and honor it when building the trade request (`type_filters.filters.rarity.option` is omitted when disabled).
- Keep semantically required cases forced regardless of setting/chip: foil → `uniquefoil` (existing separate path) and adorned jewels → `magic`.
- Add the setting to the price-check settings UI (three radio options) with English translation entries and a config migration for existing user configs.

Out of scope:
- A free-form rarity dropdown that lets the user search an arbitrary rarity unrelated to the item's own (e.g., searching a blue item as yellow); the chip only toggles the filter on/off, the value follows the item and the setting.
- Changes to presets themselves ("Pseudo" / "Base item" / "Exact" presets and when they are offered), to bulk exchange search, or to the unidentified resolver / item editor.
- poe.ninja price prediction behavior.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `price-check`: the "Trade query from generated filters" and "Filter editing" requirements change — the generated query accounts for the parsed item's rarity with a user setting and an interactive filter chip to disable the constraint.

## Impact

- Files touched (all in `renderer/src/web/`): `overlay/widgets.ts` (widget config type), `price-check/PriceCheckWindow.vue` (default config value), `price-check/settings-price-check.vue` (settings UI), `web/Config.ts` (migration for existing configs), `price-check/CheckedItem.vue` (pass option through), `price-check/filters/create-item-filters.ts`, `price-check/filters/create-presets.ts` and `create-unique-filters.ts` (opts typing), `price-check/filters/interfaces.ts` (`rarity.disabled`), `price-check/trade/pathofexile-trade.ts` (honor `disabled`; widen the rarity option type), `price-check/filters/FiltersBlock.vue` (interactive chip), `public/data/en/app_i18n.json` (+ other languages left to fallback) — most of these are files shared with upstream. Edits stay minimal and localized (the rarity block in `create-item-filters.ts`, the two rarity chips in `FiltersBlock.vue`, one setting row) so future upstream merges remain routine; the new setting default diverges from upstream behavior, which is the intended fork feature.
- Trade API: the query starts sending `"rare"` (new option value) in the default configuration; the PoE2 trade site supports it like `normal`/`magic`/`nonunique`.
- Gamepad feature: the rarity chip is inside the existing `data-gp-row` filter block and remains a focusable toggle, so gamepad navigation of the filter panel keeps working; no shortcut changes.
- Linux (X11/Wayland): no platform-specific code is touched; no impact.
