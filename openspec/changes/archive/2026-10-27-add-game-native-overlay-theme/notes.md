# Change Notes

## 6.6 Dry-run merge vs `upstream/master`

- Command: `git merge-tree --write-tree --merge-base=<merge-base> <worktree-snapshot> upstream/master`
- Result: **clean, 0 conflicts** (exit code 0, single merged tree).
- At the time of the run: fork HEAD `42030e2c` is 33 commits ahead of `upstream/master` (`cca30662`); `upstream/master` has **0** commits ahead of the merge base, so nothing needed merging yet.
- If upstream advances, the expected conflict surface matches the change's declared impact: `renderer/tailwind.config.js`, `renderer/src/web/App.vue`, `renderer/src/web/ui/*`, `renderer/src/web/overlay/Widget.vue`, `renderer/src/web/overlay/OverlayWindow.vue` (focus token), plus the small render-level edits in `renderer/src/web/price-check/` declared in the proposal (`filters/FilterBtn*.vue`, `filters/FiltersBlock.vue`, `filters/FilterModifier.vue`, `CheckedItem.vue`, `trade/TradeItem.vue`, `trade/TradeBulk.vue`, `trends/PriceTrend.vue`). No logic modules changed (`create-*-filters.ts` untouched).

## 6.4 Constraints audit (automated)

- `backdrop-filter`: **not present** anywhere in `renderer/src` (grep over `*.vue`, `*.css`).
- Motion budget: every `transition` added by this change animates only `transform` / `opacity` (verified line-by-line); the one `background-position` exception is the pre-existing hold-to-delete fill in `Widget.vue` (~1s, unchanged mechanic). A `transition: color` on `UiTabs` was caught in self-review and removed — colors now snap.
- `prefers-reduced-motion: reduce` zeroes all `--ee-dur-*` durations in `theme.css`, so themed transitions apply end-state instantly.
- Contrast (relative luminance, worst case: lowest-alpha surface `--ee-surface-sunk rgba(8,10,14,0.85)` composited over pure-white game pixels):
  - body text `--ee-text-1 #e4e8ee`: ≈ **10.9 : 1** (≥ 4.5:1 ✓)
  - secondary text `--ee-text-2 #9aa3b2`: ≈ **5.3 : 1** (≥ 4.5:1 ✓)
  - `--ee-text-3` is used for tertiary hints only (muted by design, same role as the old `gray-600`).

## 6.1 Automated checks

- `renderer`: `lint` ✓, `check-types` ✓, `test` 583 passed / 2 skipped ✓, `build` ✓
- `main`: `lint` ✓, `check-types` ✓
- `pre-commit run --all-files`: all hooks pass (format hooks stable on second run)
- `python versionCheck.py`: passes (gray remap does not touch versions)
- `data-gp-*` attributes: zero diff — gamepad navigation contract untouched; `.focused-gamepad` and `.gp-focused-row` now resolve from `--ee-focus` / `--ee-hover` so gamepad focus matches keyboard `:focus-visible`.

## 4.4 Follow-up: sourced art for regal/transmute/aug

- User report: trades priced in regal orbs showed the empty slot (regal had no reserved art).
- Art provenance: official PoE2 item icons, taken from the poecdn URLs already shipped in the repo's parsed data (`dataParser/output/de/items.ndjson`; English twin `dataParser/output_i.ndjson` was a transient file and is gone): Regal Orb → `CurrencyUpgradeMagicToRare.png`, Orb of Transmutation → `CurrencyUpgradeToMagic.png`, Orb of Augmentation → `CurrencyAddModToMagic.png` (tradeTags `regal` / `transmute` / `aug` match the trade-API pricing ids).
- Added `renderer/public/images/regal.png`, `transmute.png`, `aug.png` — 64×64 8-bit RGBA, same format/size class as the existing `divine.png`/`chaos.png`.
- Extended `currencyIcon` in `TradeItem.vue` with three `includes` lines; collisions impossible: no other pricing id contains `regal`/`transmute`/`aug`, and `G. `/`P. ` prefixes still match by base name.
- The empty-slot fallback now applies only to currencies with no sourced art at all (e.g. omens, shards, essences priced directly).
- Scope note: regal was requested; adding transmute/aug in the same pass was the agent's call (same art source, one line each) — revertible by deleting the two mapping lines and two PNGs.
- Verification: `renderer` lint ✓, `check-types` ✓, test 583 passed / 2 skipped ✓.
