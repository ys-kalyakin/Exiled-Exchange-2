# Design

## Context

Gamepad input exists only in the main process: `gamepad-io` (HID via node-hid) reads button events in `main/src/shortcuts/Shortcuts.ts`, where one `Gamepad` instance is created at construction and combos are wired per action entry inside `register()`. The renderer has no gamepad awareness; it consumes main events over the WebSocket bus (`MainProcess.onEvent`, `ipc/types.ts`). The price check window (`renderer/src/web/price-check/`) is built from native controls (`<select>` in `FilterBtnDropdown.vue`, `<input>` in `FilterBtnNumeric.vue`/`FilterModifier.vue`) plus custom buttons (`CheckedItem.vue` Search, title bar). A prior experiment (local `PriceCheckWindow.vue.b2` backup, not in the tree) validated roving focus driven by data attributes and a `.focused-gamepad` class.

Two constraints shape the design: upstream mergeability (fork edits minimal and localized) and the overlay being usable without OS window focus (HID reads never stop; Chromium gamepad polling does).

## Goals / Non-Goals

**Goals:**
- One gamepad input path: main reads HID once, renderer receives raw buttons only while the overlay is active.
- Gamepad and keyboard feed one navigation-intent layer; the same code moves focus for both.
- Price check window fully navigable: filter rows, controls within rows, Search, activation, back.
- Fix the latent gamepad registration bug (stacking listeners / `registerCombination` throw) as groundwork.

**Non-Goals:**
- Webview (trade site) input, on-screen keyboard, other windows (map check, widgets, settings), configurable mappings, X/Y/LB/RB shortcuts, stick navigation (see proposal).

## Decisions

### D1. Transport: event bus, not Chromium Gamepad API, not key injection
Main forwards `MAIN->CLIENT::gamepad-input` over the existing WS bus. Alternatives rejected: the Gamepad API duplicates device mapping in the renderer (a second stack beside `gamepad-io` configs, divergent for 8BitDo modes) and stops when the window loses focus; key injection depends on the input injector (absent on Wayland without ydotool) and races with OS focus. The bus is already the app's main→renderer channel and is platform-independent (Windows, X11, Wayland).

Event contract (in `ipc/types.ts`):
```ts
type IpcGamepadInput = Event<"MAIN->CLIENT::gamepad-input", {
  button: string; // GamepadButton name, e.g. "DPAD_DOWN", "A", "B"
  phase: "down" | "up";
}>;
```
Plus the existing `OVERLAY->MAIN::focus-game` event (already handled by `OverlayWindow.assertGameActive`, used by background clicks) reused at the end of the renderer back chain to unpin the overlay — no new main-side action type is needed.

### D2. Gating and filtering live in main
Main forwards buttons only while `overlay.isActive`; buttons participating in a registered combo (e.g. `R3`, `RT`) are never forwarded — the renderer does not need to know the combo configuration. Alternative (always broadcast, renderer decides) leaks presses to browser clients showing the settings UI and duplicates state checks per window.

### D3. Raw buttons in payload, semantics in renderer
Main is a dumb transport; each window maps buttons to its own behavior (B in a popover ≠ B in settings). Alternative (main computes `nav-next`/`activate`) couples main to UI semantics and makes future windows require main changes.

### D4. Gamepad wiring refactor in `Shortcuts.ts`
Subscriptions (`COMBO_DOWN`, `COMBO_UP`, raw `DOWN`/`UP`) attach once in the constructor; `register()` only (re)registers combinations, idempotently: track registered combo names and `unregisterCombination` before `registerCombination` (the library throws on duplicates). Handler bodies resolve the matching action entry at fire time instead of closing over loop variables. This removes the current re-register throw and listener stacking while preserving observable behavior for keyboard shortcuts.

### D5. B button: state-dependent split between main and renderer
Inactive overlay → B belongs to the game: main does not intercept it at all (the previous fork behavior of opening the overlay with B broke in-game use of the button). Active overlay → main forwards B and does not toggle; the renderer walks the back chain: open popover → active overlay window closed via its own close handler (the price check close button returns focus to the game, unpinning the overlay in the default configuration) → `OVERLAY->MAIN::focus-game` as the fallback when nothing was closed. Rationale: only the renderer knows its popover/window stack; closing a window must match its mouse-close semantics. Alternative (keep unconditional toggle) made popovers unclosable by gamepad; alternative (B opens a passive overlay) stole the button from the game.

### D6. Shared nav-intent layer with renderer-side auto-repeat
A new renderer module (proposed location `renderer/src/web/overlay/gamepad/`) exposes a single entry point that turns both `gamepad-input` events and window `keydown`/`keyup` (Arrow keys + Enter) into intents: `move(row|control, ±1)`, `activate`, `back`. Auto-repeat is implemented here with timers (≈400 ms delay, ≈80 ms interval), cancelled on release/unmount — one implementation serves gamepad holds and keyboard auto-repeat normalization. This also enables testing navigation from DevTools without a controller.

### D7. Own focus index, not `document.activeElement`
Focus is an index into a collected element list plus a `.focused-gamepad` class; activation dispatches a mouse-like `MouseEvent` with `detail: 1` — some upstream components distinguish programmatic activation (`e.detail === 0`, e.g. `el.click()`) from mouse clicks and treat the former as "apply + search" instead of toggling (`FilterModifier.toggleFilter`); activation is programmatic for buttons/checkboxes and value-stepping for native `<select>`s (change `value` and dispatch `change`, stepping options with left/right instead of opening the popup — Chromium's native select popup lives outside the DOM and cannot be driven by our synthetic input). Real DOM focus is set only for text inputs (caret), which have no gamepad text entry in v1. Alternative (roving `el.focus()`) was rejected: the select popup problem, tabindex audit across upstream components, and blur behavior stealing focus.

### D8. Two-level navigation declared by data attributes
Components mark rows with `data-gp-row`; within a row, navigable controls are collected by a selector (`button, input, select, [data-gp-control]`) in DOM order. Up/down moves rows, left/right moves controls inside the row. Rows that are not filter blocks (Search control, title bar buttons) simply participate in DOM order. Alternatives rejected: fully linear (illogical inside a 4-control row) and geometric 2D-spatial (fragile with dynamic content: collapsed blocks, ragged rows). Attribute additions keep upstream-shared components mergeable.

### D9. Lazy entry and focus stability
Opening the window shows no focus indicator; the first directional press places focus on the first row. When the focused element disappears from the DOM (filter change re-render), the index re-resolves after `nextTick` and clamps to the nearest remaining row in the movement direction. Mouse use coexists: clicks do not fight the index because the indicator only exists after entering navigation.

### D10. Focus layers ride on WidgetManager
The active navigation layer is the topmost active window in `WidgetManager` (`bringToTop` already exists; price check is the active window while shown). The composable registers per-window "navigation scopes"; intents dispatch to the topmost scope only. Alternative (a separate layer stack) creates a second "what's on top" source of truth.

### D11. Hardcoded button map
`dpad + A + B` constants live in the gamepad module, marked future-configurable. No config schema change, no settings UI, no off-switch (no presses → no effect).

## Risks / Trade-offs

- [Refactor regressions in existing global gamepad hotkeys] → idempotent registration plus a dedicated manual regression scenario (game blur/focus cycles, combo firing exactly once) in tasks; behavior change is limited to B-when-active by design.
- [B semantics change surprises existing fork users] → documented as BREAKING in the proposal; revert restores old behavior.
- [Keyboard conflicts with existing overlay keydown handlers] → keyboard surface limited to Arrow keys + Enter; audit existing listeners in price check components during implementation and keep the gamepad path fully independent of key events.
- [Select value-stepping UX differs from mouse popup] → accepted for v1; options are few (comparators, tiers); revisit only if unusable.
- [Webview shown changes the layout] → when `isBrowserShown`, navigation scopes cover only the filter panel; webview content is untouched by design.
- [Timer leaks on rapid window open/close] → repeat timers are cancelled on release, scope deactivate, and component unmount.
- [Data attributes in upstream-shared components drift on upstream merges] → additions are single attributes on existing elements, no restructuring; acceptable merge surface.

## Migration Plan

Fork-local change, no data or config migration. Order: main refactor (D4) first with behavior preserved, then event contract, then renderer module, then price check markers. Rollback: revert the change; a main that forwards unused events is harmless.

## Open Questions

None blocking. The stale `renderer/src/web/price-check/PriceCheckWindow.vue.b2` backup is unrelated to this change and can be deleted at implementation time (owner decision, it is untracked).
