# Tasks

## 1. Filter model and trade request types

- [x] 1.1 Verify the PoE2 trade API accepts `type_filters.filters.rarity.option = "rare"` (minimal query against `api/trade2/search` via dev tools or curl); record the result. If rejected, record the fallback mapping (Rare → `nonunique` under the `match` mode) as the implemented behavior.
- [x] 1.2 Extend `ItemFilters.rarity` with an optional `disabled?: boolean` in `renderer/src/web/price-check/filters/interfaces.ts`, and widen the rarity option type in `TradeRequest` (`trade/pathofexile-trade.ts`) to `"normal" | "magic" | "rare" | "nonunique" | "uniquefoil"`. Verify with `cd renderer && npm run check-types`.
- [x] 1.3 Add `rarityFilter: "match" | "nonunique" | "off"` to `CreateOptions` (and the opts types in `create-presets.ts` / `create-unique-filters.ts`), then rework the rarity assignment block in `create-item-filters.ts` per design D2: adorned jewel stays forced `magic`; `off` omits the filter; `match` maps Normal/Magic/Rare to their exact values (keep the Tablet exception and exact-preset behavior); `nonunique` keeps today's branch. Verify with `cd renderer && npm run check-types`.

## 2. Query honors the disabled flag, with tests

- [x] 2.1 In `createTradeRequest`, skip setting `type_filters.filters.rarity.option` when `filters.rarity.disabled` is set (the `uniquefoil` branch keeps precedence). Verify with `cd renderer && npm run check-types`.
- [x] 2.2 Extend `renderer/specs/web/price-check/filters/create-item-filters.test.ts`: magic item under `match` → `magic`; rare under `match` → `rare` (or recorded fallback); `off` → no rarity filter; `nonunique` → `nonunique`; adorned jewel stays `magic`; exact presets keep exact values. Verify with `cd renderer && npm run test`.

## 3. Settings plumbing

- [x] 3.1 Add `rarityFilter: "match" | "nonunique" | "off"` to `PriceCheckWidget` (`overlay/widgets.ts`), default `"match"` in `initInstance` (`price-check/PriceCheckWindow.vue`, next to the `// New Settings EE2` block), and a migration step in `web/Config.ts` that assigns `"match"` when the field is missing on loaded configs. Verify with `cd renderer && npm run check-types` and by loading the app with a pre-change config (the setting resolves to Match).
- [x] 3.2 Pass `rarityFilter` from `CheckedItem.vue` into the `createPresets` opts. Verify with `cd renderer && npm run check-types` and a manual check: with the default mode, price-checking a magic item sends a query whose rarity option is `magic` (DevTools network panel).

## 4. Settings UI and translations

- [x] 4.1 Add a three-option radio group to `price-check/settings-price-check.vue` (Match item rarity / Non-unique (legacy) / Off) with English strings under `renderer/public/data/en/app_i18n.json` (other languages fall back to English). Verify in the dev app: the row renders, switching modes changes the rarity option of the next query.

## 5. Interactive rarity chip

- [x] 5.1 Replace the two read-only rarity chips in `FiltersBlock.vue` with one interactive chip bound to `filters.rarity` (text `Normal` / `Magic` / `Rare` / `Non-unique`), toggling `disabled` on click, hidden when the filter is absent; keep it inside the existing `data-gp-row` block. Verify in the dev app: toggling the chip off and re-searching omits the rarity option; toggling on restores it; state resets when the item changes.

## 6. Integration verification

- [x] 6.1 Run the full CI-equivalent checks: `cd renderer && npm run lint && npm run check-types && npm run test`, then `cd main && npm run lint && npm run check-types`.
- [ ] 6.2 Gamepad sanity (fork constraint): with a gamepad connected, open price check, navigate the filter panel to the rarity chip, toggle it, and confirm the B-button back chain still closes the panel/window; confirm price-check shortcuts (`R3 + RT` / `L3 + RT`) still work.
- [x] 6.3 Review the diff for upstream mergeability: shared files carry only localized edits (no reformatting, fork-specific code marked like existing `// fork:` / `// New Settings EE2` comments).

## Workflow follow-up

- After review, run `/opsx:sync` (or archive) to merge the delta into `openspec/specs/price-check/spec.md`.
- Archive the change once the project's review requirements are satisfied.
