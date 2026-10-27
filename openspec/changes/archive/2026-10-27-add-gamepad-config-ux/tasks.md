# Tasks

## 1. Config foundation

- [x] 1.1 Add `GpAction` and the `{ kind: "action" }` variant to `GpIntent` in `renderer/src/web/overlay/gamepad/types.ts`; extend `buttonMap.ts` with the default shortcut-button intents (X search, Y browser, LB preset, RB section) and export the 16 Pro 2 button names in default order for the settings UI
- [x] 1.2 Add `GamepadConfig` (navigationEnabled, buttonIntents, repeatDelayMs, repeatIntervalMs, stickDeadZone, overlayCombo) to `renderer/src/web/Config.ts` with defaults built from `GAMEPAD_BUTTON_INTENTS`, add `gamepad` to `Config`/`defaultConfig()`, and bump `configVersion` to 36 with a migration filling the section and the new widget fields
- [x] 1.3 Add `gamepadHotkey: "R3 + RT"` / `gamepadHotkeyLocked: "L3 + RT"` to `PriceCheckWidget` and `gamepadHotkey: null` to `ItemCheckWidget` / `DelveGridWidget` in `renderer/src/web/overlay/widgets.ts` (+ `overlayCombo` consumed from `Config.gamepad`), and source `gamepadCombo` in `getConfigForHost()` from these fields instead of the hardcoded strings
- [x] 1.4 Add vitest coverage for the new defaults and migration: fresh config carries the full default button map and timings, an older config gains the `gamepad` section and price-check combo fields while keeping other settings

## 2. Config-driven intent layer

- [x] 2.1 Extend `createIntentSource` in `intents.ts` with `getGamepadConfig?: () => GamepadConfig | undefined` consulted per event (enabled check, button lookup with `unmapped` handling, repeat timings); keep keyboard behavior fixed and update the module's vitest block
- [x] 2.2 Pass `() => AppConfig().gamepad` from `useGamepadNavigation` in `navigation.ts` so gamepad navigation honors the config toggle and timings; navigation disabled ⇒ gamepad events produce no intents while keyboard navigation keeps working
- [x] 2.3 Implement stick navigation in `intents.ts`: subscribe `MAIN->CLIENT::gamepad-axis`, dominant-axis edge detection against the configured dead-zone, crossing outward fires the move intent through the held/repeat path and returning inside releases it; cover edges and re-triggering in the vitest block
- [x] 2.4 Implement focus memory in `navigation.ts`: `GamepadNavScope.focusKey`, per-`wmId:focusKey` remembered row state stored on window hide, restored (clamped) on the first directional press after re-show, cleared visuals unchanged

## 3. Shortcut button actions

- [x] 3.1 Add optional `runAction` to `GamepadNavScope` and dispatch `{ kind: "action" }` intents from `navigation.ts` to the topmost scope regardless of focus engagement; implement the generic `section` jump over `[data-gp-section]` markers (first row of the next section, wrapping)
- [x] 3.2 Implement the price-check scope's `runAction`: `browser` via the existing show/close browser flow, `search` and `preset` via an API exposed from `CheckedItem.vue` (`execSearch`, `selectNextPreset`); add `data-gp-section` markers to the price check window regions (title-bar row group, filters block, search row)
- [x] 3.3 Add vitest coverage for action dispatch: action intents reach the topmost scope without prior focus engagement and an `unmapped` button produces nothing

## 4. Main process: capture mode and stick forwarding

- [x] 4.1 Add `MAIN->CLIENT::gamepad-axis { x, y }` and `OVERLAY->MAIN::gamepad-capture { capture: boolean }` to `ipc/types.ts`; subscribe `GamepadEvent.MOVE` on the existing `Gamepad` in `Shortcuts.ts` and forward only `LEFT_STICK` values while the overlay is interactable
- [x] 4.2 Add the `captureMode` flag to `Shortcuts.ts` fed by `OVERLAY->MAIN::gamepad-capture`, bypassing the combo-participant filter in `forwardGamepadButton` while set; unregister stale combinations in `register()` (registered combos not in the current actions) and refresh the combo→action map
- [x] 4.3 Send `OVERLAY->MAIN::gamepad-capture` from `SettingsWindow.vue` on show/hide (and `false` on unmount)

## 5. Settings UI

- [x] 5.1 Create `GamepadComboInput.vue` under `renderer/src/web/settings/`: renders the current `"A + B"`-style combo, arms capture on click, accumulates gamepad-input buttons while capture is armed and commits the simultaneously-held set on first release
- [x] 5.2 Extend `SettingsHotkey.vue`'s `HotkeySchema` with an optional `gamepad` binding block rendered as `GamepadComboInput`, and wire the price-check, item-check, delve-grid and overlay entries in `hotkeys.vue`
- [x] 5.3 Create the `settings/gamepad.vue` page (navigation toggle, repeat delay/interval, dead-zone, per-button assignment selects over the 16 buttons with actions and `unmapped`), register it in `SettingsWindow.vue`, and add the new i18n keys to `renderer/public/data/en/app_i18n.json`

## 6. Verification

- [x] 6.1 Run renderer lint, type-check and unit tests (`npm run lint`, `npm run check-types`, `npm run test` after `npm run make-index-files`) and main lint/type-check; fix findings
- [ ] 6.2 Manual smoke check: rebinding a combo in settings persists after Save, capture records R3+RT while the settings window is shown, navigation toggle/disabled state is honored, stick moves focus, X/Y/LB/RB trigger search/browser/preset/section
