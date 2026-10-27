# Proposal: add-gamepad-config-ux

## Why

Gamepad navigation v1 (shipped in `add-gamepad-navigation`) is frozen at compile time: the button→intent map is a hardcoded constant (`GAMEPAD_BUTTON_INTENTS` in `renderer/src/web/overlay/gamepad/buttonMap.ts`), repeat timings are constants (`REPEAT_DELAY_MS` / `REPEAT_INTERVAL_MS` in `intents.ts`, only overridable via unused `createIntentSource` options), the gamepad combos are hardcoded in `getConfigForHost()` (`renderer/src/web/Config.ts`) with no UI to change them, X/Y/LB/RB do nothing inside the overlay, the sticks carry no events at all, and navigation always re-engages from the first row (`navigation.ts` resets focus state when a window hides). Nothing can be remapped without editing code. This is Phase 2 of `docs/gamepad-roadmap.md`: make the gamepad layer configurable and put the remaining buttons to work.

## What Changes

- **Configurable navigation map.** A new `gamepad` section in the renderer config, persisted through the normal config pipeline (`CLIENT->MAIN::save-config` → `ConfigStore`) with a `configVersion` migration. It holds: per-button intent assignments (keys are `gamepad-io` profile button names, values are the existing `GpIntent` variants or "unmapped"), repeat delay/interval (fed into the existing `repeatDelayMs` / `repeatIntervalMs` options of `createIntentSource`), a navigation on/off toggle, and a stick dead-zone. `buttonMap.ts` becomes the defaults source; intent lookup moves from the module constant to config.
- **Settings UI section** for that config: a per-button assignment list (navigation intent / shortcut action / none), repeat timing inputs, navigation toggle, dead-zone. Implemented as new components under `renderer/src/web/settings/`, not by restructuring shared settings pages.
- **Shortcut buttons.** X/Y/LB/RB get default in-overlay actions: execute price-check Search, toggle the trade browser, switch price-check presets, jump between filter sections. Added as a new `GpIntent` action variant so they flow through the same intent layer and the same configurable map; `MAIN->CLIENT::gamepad-input` already carries raw buttons, so the button transport does not change.
- **Combo binding UI.** Every hotkey entry in the shortcut editor (`SettingsHotkey.vue`) gains an optional gamepad binding captured "press the combo"-style: while the settings window is shown, main forwards ALL gamepad buttons including combo participants (capture mode — today `R3` / `RT` / `L3` are filtered out as combo participants, which are exactly the buttons a user must press to rebind); the combo commits as the set of buttons held simultaneously, rendered like existing `"R3 + RT"` strings. Storage moves from the hardcoded `gamepadCombo: "R3 + RT"` / `"L3 + RT"` in `getConfigForHost()` into the owning widget configs (price-check `gamepadHotkey` / `gamepadHotkeyLocked` fields, defaults preserving current behavior); other hotkey entries get optional empty bindings.
- **Left stick navigation.** The forwarding contract gains stick data (an axis payload on the gamepad events or a sibling event); the intent layer converts deflection beyond the configured dead-zone into the same directional intents as the d-pad, re-triggering while held — the edge-triggered-only consumption is adapted accordingly.
- **Focus memory.** `useGamepadNavigation` remembers the last focused row per window (keyed by item type for price check) across hide/show instead of resetting, so reopening the same item type restores focus instead of lazily re-engaging from the top.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `gamepad-navigation`: configurable button map, repeat timings, navigation toggle and stick dead-zone; shortcut-button actions; stick navigation; focus memory. Note: the v1 change `add-gamepad-navigation` is not yet archived — its delta spec must be promoted to `openspec/specs/gamepad-navigation/` first; this change's spec deltas are written against the promoted spec.
- `shortcut-hotkeys`: gamepad forwarding gains a capture mode (all buttons forwarded while the settings window is shown) and stick events; gamepad combos become user-configurable per hotkey entry.
- `config-system`: new `gamepad` config section with defaults and migration; `gamepadCombo` sourcing moves from hardcoded `getConfigForHost()` values into widget configs.

## Impact

- Code: `renderer/src/web/overlay/gamepad/{buttonMap,intents,navigation}.ts` (config-driven map and timings, action intents, stick handling, focus memory), `renderer/src/web/Config.ts` (defaults + migration bump), new settings components (`renderer/src/web/settings/` — gamepad section, gamepad combo capture input sibling to `HotkeyInput.vue`), `ipc/types.ts` (capture mode and stick payload on the fork's gamepad events), `main/src/shortcuts/Shortcuts.ts` (forwarding filter: capture mode bypasses combo-participant filtering; stick forwarding).
- Upstream mergeability: `Config.ts`, `ipc/types.ts`, `Shortcuts.ts` and `SettingsHotkey.vue` are shared with upstream but already carry fork-specific gamepad/config blocks that this change extends in place; all new logic lives in new fork-owned files per project constraints; new i18n keys are additive.
- Gamepad feature: this is a direct extension of it; global combo behavior and current defaults are preserved. Linux (X11) support: unaffected — the transport stays the platform-independent event bus, no new platform-specific code. Same code paths verified on KDE Wayland apply unchanged.
- No new dependencies: `gamepad-io ^0.3.2` already exposes the stick axes and all button names used (X, Y, LB, RB, SELECT, START are defined by the Pro 2 profile but unhandled today).

## Out of Scope

- Phase 1 items (Pro 3 receiver profile, multi-device/hot-plug, HID access guide, X11/Windows verification, full button-matrix test) — explicitly skipped by decision; the 8BitDo Pro 2 profile stays the only supported device.
- Navigation for other windows (Phase 3): widget menu, map check, item check, settings window, item editor.
- Trade-webview input, on-screen keyboard, rumble, virtual cursor (Phase 4).
- Rebinding keyboard equivalents (`KEYBOARD_KEY_INTENTS`) — configurability is gamepad-only.
- Text entry via gamepad.
