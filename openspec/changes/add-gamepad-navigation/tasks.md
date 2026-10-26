# Tasks

## 1. Main: idempotent gamepad registration (behavior-preserving refactor)

- [x] 1.1 In `main/src/shortcuts/Shortcuts.ts`, attach all `gamepad.on(...)` subscriptions once in the constructor and remove per-entry listener wiring from `register()`; handler bodies resolve the matching action entry at fire time instead of closing over loop variables. Verify: `cd main && npm run check-types` passes and price check via gamepad combo still triggers the copy-item flow (log line `[Shortcuts] Action type: copy-item`).
- [x] 1.2 Make combo (re)registration idempotent: unregister an existing combination name before `registerCombination` (the library throws on duplicates). Verify: repeatedly blur/focus the game window (shortcuts re-register) and confirm in the log that each combo fires exactly once per press, with no `Combination already registered` error; `cd main && npm run lint && npm run check-types`.

## 2. Main: gamepad input event contract

- [x] 2.1 Declare `MAIN->CLIENT::gamepad-input` (`{ button: string; phase: "down" | "up" }`) and the `close-overlay` variant of `CLIENT->MAIN::user-action` in `ipc/types.ts`. Verify: `cd main && npm run check-types && cd ../renderer && npm run check-types`.
- [x] 2.2 Forward raw button down/up events via `sendEventTo("broadcast", ...)` only while `overlay.isActive`, skipping buttons that participate in a registered combination (e.g. `R3`, `RT`). Verify: with the overlay active, a log/DevTools check shows `DPAD_*`/`A`/`B` events arriving and no `RT`/`R3` events; with the overlay passive, no events arrive.
- [x] 2.3 Implement B semantics: overlay inactive → `toggleActiveState()` (open, unchanged); overlay active → forward the B press and do not toggle. Handle `close-overlay` user-action by unpinning the overlay. Verify: manual scenario — B opens a passive overlay; B with the overlay active does not instantly unpin it (renderer closes windows instead, task 4.2); `cd main && npm run lint && npm run check-types`.

## 3. Renderer: gamepad navigation module

- [x] 3.1 Create the navigation module (proposed `renderer/src/web/overlay/gamepad/`): subscribe to `MAIN->CLIENT::gamepad-input` and emit navigation intents (`move(row/control, ±1)`, `activate`, `back`) from a hardcoded button map (`DPAD_*`, `A`, `B`), marked future-configurable. Verify: unit test feeding synthetic gamepad-input events produces the expected intents; `cd renderer && npm run test`.
- [x] 3.2 Map window `keydown`/`keyup` (Arrow keys, Enter) into the same intent stream through one shared handler. Verify: unit test asserting ArrowDown and `DPAD_DOWN` yield the same intent; `cd renderer && npm run test`.
- [x] 3.3 Implement auto-repeat in the intent layer: held direction repeats after ~400 ms at ~80 ms, cancelled on release, scope deactivate, and unmount (no timer leaks). Verify: unit test with fake timers; `cd renderer && npm run test`.
- [x] 3.4 Implement the focus engine: collect `data-gp-row` rows and in-row controls (`button, input, select, [data-gp-control]`) in DOM order; two-level index movement (up/down rows, left/right controls); lazy entry (no focus indicator before the first direction press); index clamping/re-resolution on content change via `nextTick`; activation — `click()` for buttons/checkboxes, programmatic `value` change + `change` event (option stepping) for native selects, DOM focus for text inputs only. Verify: unit tests with a jsdom fixture covering row/control movement, clamping, checkbox activation, select value stepping; `cd renderer && npm run test`.
- [x] 3.5 Register per-window navigation scopes on `WidgetManager` and dispatch intents to the topmost active scope only (reuse `bringToTop`/active-window state). Verify: unit test with two registered scopes asserting only the top one reacts; `cd renderer && npm run test`.
- [x] 3.6 Implement the back chain: open popover → active overlay window close → `CLIENT->MAIN::user-action` `close-overlay` request. Verify: unit test for chain ordering; `cd renderer && npm run test`.
- [x] 3.7 Wire the module into `renderer/src/web/overlay/OverlayWindow.vue` (where `wm` is provided) and add the `.focused-gamepad` style to the shared overlay styles. Verify: `cd renderer && npm run check-types` and the focus indicator is visible when navigating via keyboard in `npm run dev`.

## 4. Price check window integration

- [x] 4.1 Add `data-gp-row` markers (and `data-gp-control` where DOM-order collection needs help) to the price check components: `CheckedItem.vue` filter rows, the Search control row, and the title bar; keep additions attribute-only. Verify: keyboard walkthrough in `npm run dev` reaches every filter row, each control within rows, and Search; `cd renderer && npm run check-types`.
- [x] 4.2 Wire `ui-popover` instances in the price check window into the back chain (B closes the open popover before the window). Verify: open the currency popover in the title bar, press B (gamepad or mapped keyboard equivalent) — the popover closes and the window stays open.
- [x] 4.3 Full keyboard walkthrough of the spec scenarios: lazy entry on first press, row/within-row movement, checkbox toggling, select stepping, Search activation, B chain down to window close. Verify: observable behavior matches `specs/gamepad-navigation/spec.md` scenarios; note any gap and fix before group 5.

## 5. Verification

- [x] 5.1 Renderer checks: `cd renderer && npm run lint && npm run check-types && npm run test`.
- [x] 5.2 Main checks: `cd main && npm run lint && npm run check-types`.
- [x] 5.3 Manual gamepad regression (8BitDo Pro 2): gamepad price-check combo fires exactly once after several game blur/focus cycles; with the overlay active, dpad/A/B navigate the price check window per spec; B chain ends with overlay unpin; `R3`/`RT` presses produce no forwarded events. Verify on Linux (X11) and spot-check Wayland (KWin bridge); Windows build via `cd renderer && npm run make-index-files && npm run build && cd ../main && npm run build`.
