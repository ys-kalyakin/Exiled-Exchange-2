# Design

## Context

The three reported defects were introduced or exposed by recent local work:

- The theme rework commit `8114c7a2` rebuilt the filter chips: `FilterBtnNumeric.vue` restructured its template into a label button (with only `pl-2`), a value readout (disabled state) or min/max threshold editor (enabled state). The old chip had container-level `pr-1`; the rebuilt one has no gap between the label button and what follows it, so the label renders flush against (and visually overlapping) the value/editor. The sibling `FilterBtnLogical.vue` kept `pl-1 pr-2` padding and does not show the defect.
- The same commit added the trade-results price icon slot (`TradeItem.vue`, `currencyIcon` computed) with committed art for only seven currencies: divine, chaos, exalted, annulment, regal, transmutation, augmentation (`renderer/public/images/*.png`). Orb of Alchemy (trade id `alch`) and Mirror of Kalandra (trade id `mirror`) are not covered, and both are common asking prices (cheap bases are priced in alch; endgame items in mirrors).
- The fork added the gamepad combo column to each hotkey row (`SettingsHotkey.vue`: keyboard column fixed at `w-36`, then `ml-4` + `w-28` gamepad input). The split modifier control (Ctrl + Alt + key input `w-20` plus paddings/gaps) needs ≈11rem but sits in a 9rem (`w-36`) box; the ~2rem overflow spills across the 1rem margin into the gamepad input. Reported on the price check hotkey row, which uses the split control.

Constraints: files are shared with upstream and must stay mergeable (minimal, localized edits, no reformatting); the gamepad capture flow in `SettingsHotkey.vue`/`GamepadComboInput.vue` must keep working unchanged; renderer is the only package involved.

## Goals / Non-Goals

Goals:
- Eliminate the three reported visual defects with the smallest localized CSS/template changes.
- Keep chip, results-table and settings-row geometry consistent across UI languages and font sizes (the overlay scales everything through the root font size).
- Add an audit pass that catches other instances of the same defect classes before closing the change.

Non-Goals:
- Replacing the hardcoded icon map with a data-driven currency-icon pipeline (deferred, see Decisions).
- Any behavioral change to filters, trade queries, hotkey registration, or gamepad capture.
- Cleaning up the untracked `PriceCheckWindow.vue.b2` backup file.

## Decisions

### D1 — Numeric chip spacing: restore container-level separation

Add the missing separation inside `FilterBtnNumeric.vue` (e.g. a flex `gap` on the chip container or right padding on the label button, matching `FilterBtnLogical.vue`'s `pl-1 pr-2` rhythm) so label ↔ value/editor always have a visible break.

- Alternative considered: fixing it per-state in the template (spacing only the disabled value span) — rejected: the enabled state (label ↔ min input) is equally cramped and the fix would be duplicated.
- The exact spacing value is an implementation detail; target is visual parity with the logical chips at default and large font sizes.

### D2 — Missing currency icons: commit two static PNGs, extend the map

Commit `alch.png` and `mirror.png` under `renderer/public/images/` and extend the `currencyIcon` map in `TradeItem.vue`. This mirrors how `aug.png`/`regal.png`/`transmute.png` were added and keeps rendering on the existing local-image fast path (instant, offline, same `<img>` element and slot sizing).

- Art source: the game's canon art for these orbs, obtainable from the item database's poecdn icon URLs (Orb of Alchemy → `CurrencyUpgradeToRare.png` art, Mirror of Kalandra → `CurrencyDuplicate.png` art), processed to match the existing icons' transparent square format and size. If clean art cannot be produced this way, extract from the installed game files as a fallback.
- Alternative considered: runtime fallback resolving any trade id via `TRADE_TAG_TO_REF` → `ITEM_BY_REF(...).icon` (remote poecdn URL per row). Rejected for now: mixes remote images into a local-image path, adds per-row network dependence for rare currencies, and touches a shared file more deeply; revisit if users keep reporting individual currencies.
- The existing `G. `/`P. ` prefix handling (greater/perfect orb ids) stays as is; alch and mirror have no greater/perfect variants today.

### D3 — Settings hotkey row: size the keyboard column to its content, keep columns aligned

In `SettingsHotkey.vue`, replace the fixed `w-36` on the keyboard binding column with a width that actually contains the split modifier control (both variants get the same width so the gamepad column starts at one x-position on every row), and prevent the column from shrinking below its content (`shrink-0` or equivalent). The flexible row label absorbs the remaining space and may wrap.

- Alternative considered: shrinking the inner key input (`w-20` → smaller) to fit the existing `w-36` — rejected: too narrow for F-key names and future single-key bindings.
- Alternative considered: giving each row a content-sized keyboard column with no shared width — rejected: gamepad inputs would start at different x positions per row, looking ragged.
- Verification must use the longest existing translations (Russian/German labels) since the label space shrinks accordingly.

### D4 — Audit pass: same defect classes, enumerated surfaces

Walk the settings tabs (general, hotkeys, chat, gamepad, debug, help, about, price-check settings) and the price check surfaces (preset tabs row, filter rows, results table incl. header row, bulk exchange, item editor popover, top price/trend row) looking specifically for (a) fixed-width columns whose content can exceed them (overlap/clip) and (b) currencies or states with missing art. Fix findings of these two classes with the same minimal-edit approach; log anything bigger as follow-ups instead of expanding this change. Candidates spotted during planning that the audit should settle: the trade-results table headers use `whitespace-nowrap` inside an `overflow-x-hidden` wrapper (long localized headers squeeze/clip in the narrow window), and the `listedTimes` badge uses a negative right margin (`-mr-2`) that can crowd the neighboring cell.

## Risks / Trade-offs

- [Reported overlap location is user-described, not yet reproduced in-game] → The first task reproduces each defect before fixing; if the Item Level overlap turns out to be a different element (e.g. the nowrap table header rather than the chip), the fix moves to that element — the spec requirement ("label never touches or overlaps the value") holds regardless of where the correction lands.
- [Committed PNG art may look inconsistent with the existing seven icons] → Process the new art from the same source style (canon orb renders), compare side-by-side with existing icons in the price slot; the poecdn fallback ensures a usable image even if game-file extraction is unavailable on Linux.
- [Widening the keyboard column shrinks label space for long locales] → Labels wrap within `flex-1`; verified with the longest translations; the settings window content area (≈40rem) leaves enough room for columns + wrapped labels.
- [Upstream merge friction in `TradeItem.vue`/`SettingsHotkey.vue`] → Both files already diverge in exactly these regions (fork icon slot, fork gamepad column); keep edits confined to those regions.

## Migration Plan

No config, data or API changes — nothing to migrate. Rollback is `git revert` of the implementation commit(s). The renderer rebuild (`npm run make-index-files && npm run build`) is the only deployment step; assets ship in `renderer/dist` as usual.

## Open Questions

None blocking. The only deferrable unknown — whether the Item Level overlap reproduces exactly at the chip level — is covered by the reproduce-first task and does not change specs or task breakdown.
