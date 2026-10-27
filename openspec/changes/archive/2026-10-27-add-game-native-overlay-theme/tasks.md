# Tasks

## 1. Token layer

- [x] 1.1 Create `renderer/src/assets/theme.css` with the token set from design.md (surfaces, accent, borders, state layers, focus, shadows, motion, text ramp) and import it in `renderer/src/web/App.vue` before the Tailwind directives; verify the file resolves and the dev overlay still renders (two-shell dev)
- [x] 1.2 Remap the `gray` ramp in `renderer/tailwind.config.js` per design.md without touching rarity/element colors; verify `python versionCheck.py` is unaffected and the app builds (`cd renderer && npm run build` after `npm run make-index-files`)
- [x] 1.3 Add the `prefers-reduced-motion: reduce` override (zero motion durations) and the `.tnum` utility (tabular numerals) to `theme.css`/`App.vue`; verify with devtools emulation that themed transitions apply instantly under reduced motion

## 2. Shared primitives (`renderer/src/web/ui/`)

- [x] 2.1 Re-skin `UiCheckbox.vue`, `UiToggle.vue`, `UiRadio.vue` as CSS-drawn controls (accent checked state, transform-only transitions) keeping props/events identical; verify all existing call sites render and toggle correctly in dev
- [x] 2.2 Re-skin `UiTabs.vue` as text tabs with an accent indicator on a hairline baseline; verify tab switching still emits `update:modelValue` and active tab is keyboard reachable
- [x] 2.3 Re-skin `AppTitlebar.vue` (raised surface, ghost icon buttons, soft red close hover) keeping `click`/`close` slots and events; verify close and title-click behavior in price check and settings
- [x] 2.4 Re-skin `Popover.vue` (raised surface, hairline border, shadow, 120ms fade/scale entrance); verify the divine-orb exchange popover and league selection still open and close inside `#price-window` boundary
- [x] 2.5 Add `.btn` `primary`/`danger` variants, slim scrollbar, and `:focus-visible` accent ring in `App.vue`; verify Search renders as the gold CTA and Tab-focus shows the ring on buttons, inputs, and selects

## 3. Widget chrome (`renderer/src/web/overlay/`)

- [x] 3.1 Rework the `Widget.vue` hover action panel into a floating icon pill (hide/edit/move/delete, tooltips) keeping the widget-manager calls (`wm.hide/toggleEdit/toggleMove/remove`); verify each action on stopwatch/notepad widgets in dev
- [x] 3.2 Keep the hold-to-delete mechanic on the trash icon (~1s background-position fill, cancel on early release); verify delete-cancel and delete-confirm on a removable widget
- [x] 3.3 Replace square move handles with a dashed accent outline plus corner dots while keeping anchor positioning (`startMove`/`updatePosition`) untouched; verify dragging and geometry persistence in the saved config

## 4. Price check filters and listings (`renderer/src/web/price-check/`)

- [x] 4.1 Render stat filters as checkbox rows in `FiltersBlock.vue`/`FilterBtn*.vue` (checkbox + affix name; threshold editor and tier badge on enabled rows; dimmed row with natural roll range when disabled) without changing `create-*-filters.ts`; verify enabling/disabling filters re-runs the query and results update
- [x] 4.2 Verify every filter subtype (numeric, dropdown, logical, pseudo/modifier groups) works as a row or row+control and that presets and `data-gp-*` attributes are preserved; exercise via keyboard and gamepad in dev
- [x] 4.3 Polish trade listings (row hover instead of zebra, hairline separators, `.tnum` right-aligned prices) and bulk exchange (chips unchanged visually consistent with new skin); verify rare-item trade search and bulk currency search visually

- [x] 4.4 Add a currency icon in a fixed left slot of the price cell in trade listings (`TradeItem.vue`); icons of all rows are vertically aligned; currencies without sourced art keep an empty slot (per approved short design; follow-up sourced art for regal/transmute/aug — see notes §4.4)

## 5. Settings and exclusive windows pass

- [x] 5.1 Walk all settings tabs on the new surfaces; apply localized class tweaks only where forms are unreadable or misaligned; verify hotkey capture, gamepad combo input, and toggles/checkboxes still function
- [x] 5.2 Verify help, notepad, item-search, leveling, and client-log widgets render coherently on the token surfaces; fix only token-level issues (no layout rework)

## 6. Integration verification

- [x] 6.1 Renderer checks: `cd renderer && npm run lint && npm run check-types && npm run test`; main checks: `cd main && npm run lint && npm run check-types`
- [ ] 6.2 Gamepad navigation pass over price check, settings, and a normal widget: every interactive element shows the shared accent focus indicator, B-button back chain still closes popovers/windows
- [ ] 6.3 Locale pass (ru/en): Cyrillic renders via FrizQuadrataC without tofu; price columns align with tabular numerals
- [x] 6.4 Contrast check of body text on the lightest themed surface (≥ 4.5:1) and confirm no `backdrop-filter` and no non-transform/opacity animations were introduced (grep + devtools)
- [x] 6.5 `pre-commit run --all-files` passes
- [x] 6.6 Dry-run merge against `upstream` master in a scratch branch; confirm conflicts are confined to `tailwind.config.js`, `App.vue`, `web/ui/*`, and `Widget.vue`, and record the result in the change notes
