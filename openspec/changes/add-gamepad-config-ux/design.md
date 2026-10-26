# Design

## Context

Gamepad navigation v1 (see proposal.md) wires `main/src/shortcuts/Shortcuts.ts` → `MAIN->CLIENT::gamepad-input` → `renderer/src/web/overlay/gamepad/` (`buttonMap.ts` constants, `intents.ts` edge-triggered intent source, `navigation.ts` scope dispatch) → `useGamepadNavScope` in `PriceCheckWindow.vue`. Combos are hardcoded in `getConfigForHost()` (`renderer/src/web/Config.ts`); settings pages edit a `configClone` and only apply+save on the Save button. `gamepad-io ^0.3.2` (local checkout at `~/projects/gamepad-io`) exposes `GamepadEvent.MOVE` with `StickValue {x, y}` normalized to [-1, 1] (y: -1 = up) and `GamepadButton` names including `X, Y, LB, RB, SELECT, START, LT, RT, L3, R3` — the last group is unhandled today.

Fork constraints: keep `Config.ts`, `ipc/types.ts`, `Shortcuts.ts`, `SettingsHotkey.vue` edits minimal and localized (upstream mergeability); new logic in fork-owned files (`overlay/gamepad/*`, `settings/*` gamepad components); i18n keys additive; behavior on Linux (X11 + KWin Wayland) rides the same platform-independent event bus.

## Goals / Non-Goals

**Goals:**
- One config-driven path for button map, repeat timings, navigation toggle and stick dead-zone, consumed by the existing intent layer without re-subscription.
- Shortcut buttons (X/Y/LB/RB) flowing through the same intent/scope mechanism as movement.
- Combo rebinding per hotkey entry, stored in the owning widget config, captured "press the combo"-style in the settings window.
- Left-stick navigation and per-window (per-item-type) focus memory.

**Non-Goals:**
- Phase 3/4 roadmap items (more windows, trade webview input, rumble, virtual cursor); keyboard rebinding; gamepad text entry; persistence of focus memory across restarts.

## Decisions

### D1: Config shape and migration (configVersion 35 → 36)

Root-level `Config.gamepad: GamepadConfig`:

```ts
interface GamepadConfig {
  navigationEnabled: boolean;        // default true
  buttonIntents: Record<string, GpIntent | "unmapped">; // full map, keys = Pro 2 button names
  repeatDelayMs: number;             // default 400
  repeatIntervalMs: number;          // default 80
  stickDeadZone: number;             // default 0.5, range 0..1
  overlayCombo: string | null;       // gamepad binding for the overlay toggle key (default null)
}
```

`buttonIntents` is a **full explicit map** (not sparse overrides): the settings UI can render every button as a plain select with no "default vs override" state, and saved configs stay self-describing. Cost: a changed code default does not reach existing configs — accepted, it is user-visible configuration like any widget field. Keys cover the 16 profile buttons (d-pad, A/B/X/Y, LB/RB, LT/RT, L3/R3, SELECT/START); sticks are axes, not buttons. `GpIntent` gains `{ kind: "action"; action: GpAction }` with `GpAction = "search" | "browser" | "preset" | "section"` — already JSON-serializable. Defaults: d-pad moves, A activate, B back, X search, Y browser, LB preset, RB section, everything else `unmapped`.

Widget fields for combo bindings live next to the keyboard binding they extend: `PriceCheckWidget.gamepadHotkey` / `gamepadHotkeyLocked` (defaults `"R3 + RT"` / `"L3 + RT"` preserve v1), `ItemCheckWidget.gamepadHotkey`, `DelveGridWidget.gamepadHotkey` (default `null`). Migration 36 adds the section and fields with these defaults; `defaultConfig()` includes them for fresh installs.

Alternative considered: sparse override map over code defaults — smaller configs, but forces "reset to default" UI state; rejected.

### D2: Intent layer reads config via per-event getters

`createIntentSource` options gain `getGamepadConfig: () => GamepadConfig | undefined` (`undefined` ⇒ gamepad path inert). The getter is evaluated **per event** for: enabled check, button→intent lookup, repeat timings (held timer re-arms read the current values) and stick dead-zone. `GAMEPAD_BUTTON_INTENTS` stays in `buttonMap.ts` as the defaults source used by `defaultConfig()`; the module-level constant is no longer consulted at dispatch time. Keyboard handling (`KEYBOARD_KEY_INTENTS`, fixed) is untouched.

This avoids re-creating the source (and dropping an in-progress hold) when settings are saved, and avoids stale closures. `navigation.ts` passes `() => AppConfig().gamepad` (root config is deeply reactive).

### D3: Action intents dispatch through the scope

`GamepadNavScope` gains optional `runAction?(action: GpAction): boolean`. `navigation.ts` dispatches `{kind:"action"}` to the topmost scope **regardless of focus engagement** (that is what makes X a shortcut). The `section` action is handled generically in `navigation.ts` (it only needs the scope root): rows inside `[data-gp-section]` marker elements form sections; the jump moves focus to the first row of the next section in DOM order, wrapping. `PriceCheckWindow.vue`'s scope implements `search`, `browser` (existing `showBrowser`/`closeBrowser`) and `preset` by delegating to a small API `defineExpose`d from `CheckedItem.vue` (`execSearch()` = `doSearch = true`, `selectNextPreset()` cycles `presets.active`, template-ref based). Clicking the real controls stays the single activation path — no duplicated search/preset logic.

`data-gp-section` markers are added in the price check window template (title-bar row group, the filters block, the search row). B-button back chain and movement are untouched.

### D4: Stick transport and edge detection

Main subscribes `GamepadEvent.MOVE` on the existing `Gamepad` instance and forwards **only `LEFT_STICK`**, unfiltered, as a new sibling event `MAIN->CLIENT::gamepad-axis { x, y }` (same `isInteractable` gate as buttons; raw values — dead-zone is a renderer concern). A sibling event keeps the button payload shape untouched for upstream mergeability.

Renderer (`intents.ts`): a stick converter keeps edge state per the **dominant axis** (`|x| >= |y|` → x else y). Crossing from inside to outside the dead-zone fires the corresponding move intent through the existing `pressHeld` path (so auto-repeat and held-replacement come for free); returning inside fires the release. Diagonals resolve to the dominant axis — one direction at a time, no jitter between two held directions. Sign mapping uses gamepad-io's convention (y > 0 = down = row +1). Events arrive per HID report; the converter is O(1) and cheap.

Alternative considered: forward only dead-zone crossings from main — rejected, dead-zone is renderer config and main does not read the renderer config.

### D5: Capture mode transport

New renderer→main event `OVERLAY->MAIN::gamepad-capture { capture: boolean }`. `SettingsWindow.vue` watches its settings widget's `wmWants` and sends the event on change (also on unmount → `false`). `Shortcuts.ts` subscribes in its constructor (same pattern as `WidgetAreaTracker`), stores a `captureMode` flag, and `forwardGamepadButton` skips the combo-participant filter while it is set. The `isInteractable` gate stays: capture works while the settings window keeps the overlay interactive, which is exactly the binding-UI case. Capture is independent of `navigationEnabled` — the binding input must record buttons even when navigation is off.

### D6: Combo sourcing and stale-combo cleanup

`getConfigForHost()` reads combos from the owning config slice: price-check actions use `priceCheck.gamepadHotkey` / `gamepadHotkeyLocked`, the `toggle-overlay` action uses `config.gamepad.overlayCombo`, item-check/delve-grid actions use their widget's `gamepadHotkey`; empty/null ⇒ the action carries no `gamepadCombo`. `Shortcuts.register()` additionally **unregisters stale combinations**: after re-registration, any registered combination not present in the current actions is removed (`unregisterCombination`) and dropped from the combo→action map. Without this, a rebound combo would keep firing under its old binding forever, since `gamepad-io` combinations persist across re-registrations by design.

### D7: Settings UI

New fork-owned components under `renderer/src/web/settings/`:
- `gamepad.vue` — a new settings page (`name: "settings.gamepad"`) added to the settings menu: navigation toggle, repeat delay/interval inputs, dead-zone input, and the per-button assignment list (each of the 16 buttons → select with navigation intents, the four actions, `unmapped`; the shipped default is labeled in the option text).
- `GamepadComboInput.vue` — sibling to `HotkeyInput.vue`: shows the current combo as a `"R3 + RT"`-style string; clicking arms capture, then it accumulates gamepad-input buttons while held and commits the held set as `"A + B"` on the first release (the same strings `gamepad-io` parses from `gamepadCombo`).
- `SettingsHotkey.vue`'s `HotkeySchema` gains an optional `gamepad?: { value: string | null }` block rendered as a `GamepadComboInput` beside the keyboard input; `hotkeys.vue` supplies the new widget fields. Edits land on the settings `configClone` and persist through the normal Save pipeline.

### D8: Focus memory

`GamepadNavScope` gains optional `focusKey?: () => string | undefined`. `navigation.ts` keeps `Map<string, FocusState>` keyed `wmId + ":" + (focusKey ?? "")`: on window hide the current focus state is stored (visuals still cleared — the DOM persists via v-show and must not show a stale ring); on the first directional press for a disengaged scope the remembered row index is restored, clamped to the current row count. The price check scope reports `item.value.category` as its focus key (undefined when no parsed item ⇒ no memory). Memory is module-lifetime only.

The hide-watcher that today resets `focusState` becomes the store point; `resetFocusFor` restores from memory instead of always starting at row 0.

## Risks / Trade-offs

- [Full `buttonIntents` map freezes defaults into saved configs] → Defaults only change deliberately in fork code; the settings UI shows the current value so drift is visible.
- [Stick MOVE events flood the event bus at HID report rate] → Only `LEFT_STICK` is forwarded and only while the overlay is interactive; the payload is two numbers. If profiling ever shows a cost, main can rate-limit without a contract change.
- [Combo capture records combos `gamepad-io` may reject (e.g. single-button "combos" colliding with plain forwarding)] → The capture input commits only sets of simultaneously held buttons; `Shortcuts` logs registration failures like it does for keyboard shortcuts, and an invalid combo simply does not fire.
- [`gamepad-io` unknown-button names from a hand-edited config] → Unknown names never match `GamepadButton` events; combos with unknown buttons fail registration with a logged error, navigation lookups return `unmapped` behavior.
- [Upstream merge friction in `SettingsHotkey.vue` / `hotkeys.vue`] → Changes are additive optional fields/props only, localized to the fork's gamepad blocks.

## Migration Plan

configVersion 36 migration runs in `upgradeConfig` on load; a failed migration leaves the previous config untouched (same behavior as existing migrations). Rollback = revert the change; older builds ignore the unknown `gamepad` section keys on load (JSON extra fields) and re-migrate on next save.

## Open Questions

None.
