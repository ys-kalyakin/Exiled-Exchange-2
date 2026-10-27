# Design

## Context

`createFilters` (`renderer/src/web/price-check/filters/create-item-filters.ts:324-354`) already emits a `filters.rarity` value for every normal/magic/rare item: `normal`/`magic` only when the preset is exact, otherwise `nonunique` (adorned jewels always `magic`). The chip rendering those values in `FiltersBlock.vue:46-57` is read-only, and `createTradeRequest` (`pathofexile-trade.ts:645-653`) applies the value unconditionally — there is no `disabled` concept for this filter, unlike `corrupted`/`mirrored`/`influences`. Settings for the widget live on `PriceCheckWidget` (`overlay/widgets.ts`), are defaulted in `PriceCheckWindow.vue` `initInstance`, surfaced in `settings-price-check.vue` via `configModelValue`, and get defaults for pre-existing configs through the migration chain in `web/Config.ts` (~line 340-500). Translations are JSON files fetched at runtime from `public/data/<lang>/app_i18n.json` with English fallback.

See proposal.md — Why — for motivation; see the delta spec for the behavior contract.

## Goals / Non-Goals

Goals:
- One setting that picks the default rarity constraint mode; one interactive chip for per-search override.
- Minimal, localized diffs in upstream-shared files.

Non-Goals:
- Free-form rarity dropdown (searching a rarity unrelated to the item); preset logic changes; bulk-exchange path.

## Decisions

**D1: Tri-state setting `rarityFilter: "match" | "nonunique" | "off"`, default `"match"`.**
A boolean cannot express "back to upstream behavior"; a tri-state keeps the legacy mode available and makes "off" a real kill switch, which is what the request asks for. Alternative considered: no setting, only the per-search chip — rejected because the user asked for a global disable. Default `"match"` changes behavior for existing users; that is the requested feature, and `"nonunique"` remains one click away.

**D2: The mode resolves inside `createFilters`' existing rarity block.**
`CreateOptions` gains `rarityFilter`; the block computes `{ value, disabled }`:
- foil → untouched (`filters.foil` → `uniquefoil` path in `createTradeRequest` stays first);
- adorned jewel → `{ value: "magic" }` always;
- `"off"` → no `filters.rarity` at all (adorned jewel excepted);
- `"match"` → `normal`/`magic`/`rare` by the item's rarity, except Tablets keep today's rule (Tablet magic items compare against rare ones) and exact presets behave as today;
- `"nonunique"` → exactly today's branch.
The chip then only mutates `rarity.disabled`, mirroring how `mirrored`/`influences` chips work. Alternative considered: resolve the mode at query-build time in `createTradeRequest` — rejected, it would split the decision across two modules and lose the chip.

**D3: `ItemFilters.rarity` becomes `{ value: string; disabled?: boolean }`; `createTradeRequest` skips the option when `disabled`.**
Optional `disabled` avoids touching `create-unique-filters.ts` and any other producers. Note the semantics differ from `mirrored` (where `disabled` inverts the sent value): for rarity, disabled means *omit* — the guard must be explicit. The `TradeRequest` type for the option widens to `"normal" | "magic" | "rare" | "nonunique" | "uniquefoil"`.

**D4: One interactive chip replacing the two read-only ones.**
`FiltersBlock.vue` renders a single chip bound to `filters.rarity` with text `Normal` / `Magic` / `Rare` / `Non-unique`, toggleable via the existing logical-filter button component; no chip when the filter is absent (`"off"`). It stays inside the existing `data-gp-row` block, so gamepad navigation is unchanged structurally.

**D5: `"rare"` is a valid trade option; verify first, fall back if not.**
The PoE2 trade site exposes the same rarity options as the app already uses plus `rare`. The verification (a query with `rarity: {"option": "rare"}` returning results) is an early implementation task; if it fails, `"match"` maps Rare → `nonunique` and only the spec scenario for `rare` is adjusted.

**D6: Config plumbing follows the existing per-widget setting pattern.**
`PriceCheckWidget.rarityFilter` typed in `widgets.ts`; default in `initInstance`; a `Config.ts` migration step assigns `"match"` when the field is missing on loaded configs; settings row in `settings-price-check.vue` (radio group) with English strings in `public/data/en/app_i18n.json` (other languages fall back to English); `CheckedItem.vue` passes the value into `createPresets` opts.

## Risks / Trade-offs

- [Trade API rejects `"rare"`] → D5 verification first; documented fallback mapping Rare → `nonunique`.
- [Default-mode change surprises existing users] → legacy mode stays selectable; migration only fills the missing field.
- [Per-preset chip state resets when the item or preset changes] → consistent with every other item filter chip; accepted.
- [Upstream merge friction in the rarity block] → keep the new logic in one localized branch guarded by the new opts field; no reformatting.

## Migration Plan

Ship in one release: config migration fills `rarityFilter` on load; no stored data is affected. Rollback = revert the commit; the extra config field is inert on older builds.

## Open Questions

None.
