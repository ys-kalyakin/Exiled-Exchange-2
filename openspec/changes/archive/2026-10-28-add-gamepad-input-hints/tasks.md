# Tasks

## 1. Input-mode tracking

- [x] 1.1 Create `renderer/src/web/overlay/gamepad/inputMode.ts` exporting `inputMode = ref<'gamepad' | 'keyboard' | null>(null)` with the fork comment header (sibling of `capture.ts`); verify `npm run check-types` passes in `renderer`
- [x] 1.2 Extend `createIntentSource` in `renderer/src/web/overlay/gamepad/intents.ts` so `onIntent` receives a source (`'gamepad'` from the button and stick-axis subscriptions, `'keyboard'` from the keyboard subscription); update existing in-file vitest call sites and add cases asserting the source arrives with dispatched intents and that unmapped buttons and disabled navigation produce no callback; verify `npm run test` passes in `renderer`
- [x] 1.3 In `renderer/src/web/overlay/gamepad/navigation.ts`, write `inputMode.value = source` in the `onIntent` handler; update any affected in-file tests; verify `npm run test` passes in `renderer`

## 2. Hint chips and component

- [x] 2.1 Add the `move`, `keyboard_move`, `keyboard_activate` keys under `settings.gamepad.hints` in `renderer/public/data/en/app_i18n.json` (English only, other locales untouched); verify the JSON parses and `npm run test` still passes in `renderer`
- [x] 2.2 Create `renderer/src/web/overlay/gamepad/hints.ts` — a pure chip builder that takes the `gamepad` config section and a mode (`'gamepad' | 'keyboard'`) and returns ordered chips (movement chip + mapped buttons in `GAMEPAD_BUTTONS` order, skipping `unmapped`, labels from `settings.gamepad.intent.*`); add in-file vitest cases for the default map, a remapped button, and skipped unmapped buttons; verify `npm run test` passes in `renderer`
- [x] 2.3 Create `renderer/src/web/overlay/gamepad/InputHints.vue`: hidden until `inputMode` becomes non-null for the current window show (reset on hide), renders the chips from `hints.ts` in the `toggle_browser_hint` keycap style, absolutely positioned at the window's bottom edge so it does not reflow content; verify `npm run check-types` and `npm run lint` pass in `renderer`

## 3. Price check window mount

- [x] 3.1 Mount `InputHints.vue` in `renderer/src/web/price-check/PriceCheckWindow.vue` as a minimal localized insertion (one import + one template tag at the window root, passing the app config); verify `npm run lint` and `npm run check-types` pass in `renderer`
- [ ] 3.2 Verify the adaptive behavior manually in the dev overlay: d-pad press shows gamepad chips with no content reflow, ArrowDown switches to keyboard chips, a mapped gamepad press switches back, a remapped X shows its new action, closing and reopening the window hides the bar until the next intent

## 4. Full verification

- [x] 4.1 Renderer checks: `npm run lint && npm run check-types && npm run test` in `renderer`
- [x] 4.2 Main checks (package untouched, must stay green): `npm run lint && npm run check-types` in `main`

## Workflow follow-up

- Archive the change via `/opsx:archive` once implementation and review are complete; delta specs sync into `openspec/specs/gamepad-navigation/`.
