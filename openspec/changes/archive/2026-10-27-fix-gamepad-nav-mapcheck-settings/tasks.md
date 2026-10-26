# Tasks

## 1. Focus ring persistence

- [x] 1.1 In `createGamepadNavigator.dispatch` (activate branch, `renderer/src/web/overlay/gamepad/navigation.ts`), re-apply `applyFocusVisual` on the next Vue tick after `activateControl`, re-collecting rows and re-clamping the state; keep the navigator's single-owner rule for focus visuals. Cover with a vitest block case: an activation that re-binds the focused control's class leaves the `focused-gamepad` class present after the tick (`cd renderer && npm run test`)
- [x] 1.2 Add a vitest case for the re-apply when the activation re-render removes rows (state clamps, no out-of-range index); run `cd renderer && npm run test`

## 2. Map check combo and pinning

- [x] 2.1 In `renderer/src/web/item-check/widget.ts` set `gamepadHotkey: "L3 + LT"` in `initInstance`; in `renderer/src/web/Config.ts` bump `configVersion` to 37 with a migration filling the item-check `gamepadHotkey` when it is `undefined` (preserve an explicit `null`). Vitest: fresh config carries the default; an older config gains it while other settings stay untouched (`cd renderer && npm run test`)
- [x] 2.2 In `main/src/shortcuts/Shortcuts.ts`, mark gamepad-initiated triggers in the `COMBO_DOWN` handler and consume the flag in the `copy-item` delivery callback: with `action.focusOverlay` set, call `overlay.assertOverlayActive()` unconditionally; keyboard-triggered copies keep the `wasUsedRecently` gate. Verify by reading the flow against the `Gamepad combination dispatch` requirement and `cd main && npm run check-types`

## 3. Capture-mode combo suppression

- [x] 3.1 In `Shortcuts.ts`, early-return from the `COMBO_DOWN` action dispatch while `gamepadCapture` is true, leaving raw button forwarding untouched; verify with `cd main && npm run lint && npm run check-types`

## 4. Debug logging for on-rig diagnosis

- [x] 4.1 In `Shortcuts.ts` `forwardGamepadButton`, add a debug-log line (button, phase, capture flag) through the existing debug logger so a rig session shows whether presses are forwarded and under which names; verify `cd main && npm run lint && npm run check-types`
- [x] 4.2 Commit the headless repro harness from design.md (fake backend script + usage steps) as a developer aid under `docs/` or `renderer/specs/`; verify the documented steps reproduce menu/settings/map-check navigation in a plain browser

## 5. Full verification

- [x] 5.1 Run `cd renderer && npm run lint && npm run check-types && npm run test` and `cd main && npm run lint && npm run check-types`; fix findings

## 6. Manual gamepad pass (KDE Plasma 6 Wayland, 8BitDo Pro 2)

- [ ] 6.1 Map check end-to-end: in game, press the item-check combo over a waystone → overlay pins, map check shows; d-pad moves over profile buttons and stat rows; A cycles the stat color and the ring stays on the button; d-pad right reaches the eye toggle and A toggles it; B hides the widget, next B unpins the overlay. Confirm `L3 + LT` coexists with `L3 + RT` (fallback per design D5 if not)
- [ ] 6.2 Settings navigation with the debug log on: open the overlay, enter settings from the widget menu, capture a forwarded-press log excerpt; navigate menu column, page controls, Save/Cancel; verify `R3 + RT` during capture does not replace the settings window and that combos fire again after closing settings. Record the log findings; if presses are not forwarded or arrive under unexpected names, file the follow-up with the excerpt
