# Design: fix-gamepad-nav-mapcheck-settings

## Context

The navigation engine (`renderer/src/web/overlay/gamepad/`) delivers intents to the topmost shown registered scope; the settings window, the item-check widget (map check / item info) and the widget menu register scopes with DOM-derived rows. The proposal lists the four code-verified/repro-verified gaps; this design fixes them and sets up the diagnosis of the residual on-rig settings failure.

Evidence base (headless repro, done during planning): vite dev server + a fake main-process backend (HTTP `/config`, WS `/events` relay, POST `/inject` to broadcast IPC events) driving the renderer in a plain browser with real `MAIN->CLIENT::gamepad-input` events over the transport. In that environment: menu navigation works; settings navigation engages and moves through title bar → menu column → page rows; map check synthesizes rows, and A on a stat row cycles the decision color — but the `focused-gamepad` ring is wiped by Vue's class re-patch on exactly those activations. This isolates the renderer-side bugs from the on-rig failure (which the repro cannot reproduce — the rig differences are main-process forwarding, the KWin bridge and the physical device).

## Goals / Non-Goals

- Goals: map check reachable, navigable and color-cyclable from the pad end-to-end; focus ring stable across activations; settings sessions protected from combo-driven window replacement; a documented harness and on-rig diagnosis path for the settings failure.
- Non-Goals: passive-overlay button forwarding (the game keeps the pad while the overlay is passive); any change to price check navigation, stick handling or the B-button chain semantics; X11/Windows verification passes (roadmap follow-ups).

## Decisions

### D1: Focus ring re-applied after the Vue flush
`activateControl` dispatches a real click; Vue re-renders the control and its class bindings (`:class="[btnStyle().bg]"` on `MapStatButton`, `active` on settings menu entries), overwriting the imperative `focused-gamepad` class. Fix in `createGamepadNavigator.dispatch` (activate branch): after `activateControl`, re-apply `applyFocusVisual(root, focusState, { rows })` in a Vue `nextTick` (the module already imports Vue). Re-applying rather than patching individual classes keeps the navigator the single owner of focus visuals. Rows are re-collected at re-apply time, so a re-render that removes rows clamps naturally.
- Alternative rejected: styling focus via `:focus-visible`/native focus — the engine does not use native focus, and custom widgets (UiToggle, cycle buttons) would each need changes.
- Alternative rejected: MutationObserver on class attributes — heavier and racy against Vue's patch order.

### D2: Map check opens with the pad via a default combo and an unconditional pin
`ItemCheckWidget.gamepadHotkey` defaults to `"L3 + LT"` (`Config.ts` migration, `configVersion` 36 → 37); the shortcut registry already forwards it (`gamepadCombo: itemCheck.gamepadHotkey`). In `Shortcuts.ts`, the `COMBO_DOWN` handler marks the trigger as gamepad-initiated; the `copy-item` delivery callback consumes that flag: with `action.focusOverlay` set, it calls `overlay.assertOverlayActive()` unconditionally instead of gating on `overlay.wasUsedRecently`. Keyboard-triggered copies keep the gate.
- Alternative rejected: forwarding buttons while the overlay is passive so the widget could be consulted without pinning — collides with the fork rule that the game owns the pad (notably B) while passive, and doubles the interaction model. Pinning keeps one model: pad interaction ⇒ pinned overlay ⇒ existing back chain (`B` hides the map check, next `B` unpins).
- Alternative rejected: no default (rely on the user binding one in settings) — the reported breakage is exactly the out-of-the-box flow.

### D3: Capture mode gates combo actions, not forwarding
In `Shortcuts.ts`, the `COMBO_DOWN` handler returns early while `gamepadCapture` is true (the settings window is shown). Raw button forwarding is untouched — the binding UI keeps receiving every button, including combo participants, which is what capture mode exists for. On capture end the combos fire again without re-registration.
- Alternative rejected: unregistering combinations while capturing — churns gamepad-io state, breaks "press the combo you already had" comparisons, and re-registration is where the stale-combo bugs lived.

### D4: On-rig diagnosis = debug logging + the documented harness
The repro harness (fake backend script + curl event injection, reproduced in the appendix below) becomes the documented way to verify renderer-side navigation without the game; the tasks include committing it under `docs/` or `renderer/specs/` as a developer aid. For the real rig, `Shortcuts.ts` gains a debug-level log line in `forwardGamepadButton` (button + phase + capture flag) so a KDE Wayland session log shows whether settings-window presses are forwarded at all and with which button names. The log is gated behind the existing debug logger, so it is invisible in normal play.
- Rationale: the repro proves the renderer path sound; the failure must be in delivery (forwarding gate, focus transitions) or device naming, and only the rig can answer that. The fix for whatever it reveals is a follow-up change if it is not one of the hazards fixed here.

### D5: Default combo choice `L3 + LT`
Price check owns `R3 + RT` and `L3 + RT`. `LT` is unused by any default combo, and `L3 + LT` is unlikely to be pressed accidentally in game (both are "modifier-style" inputs). gamepad-io matches combinations as exact button sets, so sharing `L3` with the locked price check is expected to work; the on-rig pass verifies this explicitly (task 6), with fallback `R3 + LT` if the shared-member combination misbehaves.

## Risks / Trade-offs

- [nextTick re-apply lands before Vue's class patch in some edge (rebound rows)] → the re-apply re-collects rows and re-clamps; worst case the ring waits for the next directional press (today's behavior), never worse.
- [`L3 + LT` misbehaves as a shared-member combination] → verified first on the rig; fallback default `R3 + LT`-style distinct set, migration adjusted before release.
- [Unconditional pin on pad-triggered copy could pull focus from the game unexpectedly] → it only fires on an explicit gamepad combo the user pressed to open the window; the keyboard flow is untouched.
- [Capture suppression could mask a combo the user tries to "test" while binding] → the binding UI commits the combo from raw events; testing an existing binding is a settings-close away. Documented in the combo hint text if needed.
- [Debug log verbosity] → gated behind the debug logger already used for gamepad-io messages.

## Migration Plan

`configVersion` 36 → 37: the migration fills `ItemCheckWidget.gamepadHotkey = "L3 + LT"` when the field is missing or empty. The field never had a working combo before this change, so a pre-migration empty binding is the old default (set by the v36 migration), not a deliberate clearing — filling it is what makes the map check pad-openable out of the box. A user-set binding is kept, and clearing the combo after the migration persists (the rung does not re-run). Rollback: revert the migration bump; the field is additive and ignored by older code.

## Appendix: headless repro harness

Used during planning; the tasks turn it into a committed dev aid.

1. Fake backend (Node, `ws` from `main/node_modules`), listening on `127.0.0.1:8584`: `GET /config` → `{ version, updater: { state: "initial" }, contents }`; `POST /config-set` stores `contents`; `POST /inject` broadcasts `{ name, payload }` to all WS clients. Vite's dev proxy (`^/(config|uploads|proxy)` and `ws /events`) already points at this port.
2. Serve a config containing the widget menu (defaultConfig lacks it): build `defaultConfig()` in the page (`await import("/src/web/Config.ts")`), push the menu widget shape from `WidgetMenu.vue` `initInstance`, POST to `/config-set`, reload.
3. The ZCode in-app browser UA contains "Electron", so the renderer believes Electron is present — activate the overlay with `POST /inject {"name":"MAIN->OVERLAY::focus-change","payload":{"overlay":true,"game":false}}` (exactly what main sends when pinning).
4. Drive the pad: `POST /inject {"name":"MAIN->CLIENT::gamepad-input","payload":{"button":"DPAD_DOWN","phase":"down"}}` (+ `up`). Assert `.focused-gamepad` / `.gp-focused-row` in the target widget.
5. Map check: `POST /inject {"name":"MAIN->CLIENT::item-text","payload":{"target":"item-check","clipboard":"<waystone text from renderer/specs/Parser/items.ts RareMap>","position":{"x":700,"y":450},"focusOverlay":false}}`.

## Open Questions

- The exact on-rig cause of the reported dead settings navigation (delivery vs device naming) — answered by the diagnosis task; the fixes here are required regardless. If the rig reveals a third cause, it becomes a follow-up change.
