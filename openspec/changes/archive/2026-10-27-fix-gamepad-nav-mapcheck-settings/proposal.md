# Proposal: fix-gamepad-nav-mapcheck-settings

## Why

Gamepad navigation still does not reach its two remaining surfaces in practice. The map check widget (waystone stats with per-row color cycling) cannot be opened or driven from the pad at all: it has no gamepad combo (`ItemCheckWidget.gamepadHotkey` defaults to `null`), raw buttons are not forwarded while the overlay is passive (the state the map check lives in when opened in game), and pinning the overlay with the price-check combos runs a price check whose window replaces the map check widget (exclusive z-order swap). Separately, activating a focused control wipes the `focused-gamepad` ring whenever the control's class binding changes on activation — verified in a browser repro: pressing A on a map stat row cycles the color and erases the focus ring until the next directional press, which makes navigation look dead exactly when the user tries to pick a color. The settings window navigates in the headless repro once events arrive, but the user reports it dead on the real rig, and two code-verified hazards there (combo actions still firing during capture mode, ring wipe on every page/checkbox activation) degrade it further.

## What Changes

- **Gamepad combo for map check.** `ItemCheckWidget.gamepadHotkey` gets a default binding (`L3 + LT`, user-configurable through the existing hotkey editor) with a config migration; the item-check `copy-item` action already forwards it as `gamepadCombo`.
- **Gamepad-initiated item copy pins the overlay.** When a `copy-item` action is triggered by a gamepad combo and `focusOverlay` is set, main calls `assertOverlayActive()` unconditionally (today it is gated on `overlay.wasUsedRecently`, which fails exactly on a fresh session). This makes the pad-opened map check interactive without touching the keyboard-triggered flow.
- **Focus ring survives activation.** After `activateControl`, the navigator re-applies the focus visuals on the next Vue flush, so controls whose class bindings change on activation (map stat cycle buttons, profile buttons, menu toggles) keep the ring.
- **Capture mode suppresses combo actions.** While the settings window keeps `gamepadCapture` on, registered gamepad combinations no longer execute their shortcut actions (today pressing `R3 + RT` while browsing settings opens the price check window and replaces the settings window).
- **On-rig diagnosis for the settings failure.** The settings window navigates in the headless repro (documented harness in design.md), so the residual real-rig failure gets an explicit diagnosis task: debug logging of forwarded buttons in `Shortcuts.ts` plus a manual KDE Wayland pass; fixes for the two verified hazards above are part of this change.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `gamepad-navigation`: the item-check widget becomes reachable and navigable from the pad (default combo, pinned overlay, stat rows focusable, A cycles the row's color); the focus indicator persists across activation-induced re-renders.
- `shortcut-hotkeys`: gamepad-initiated `copy-item` with `focusOverlay` pins the overlay regardless of recent use; capture mode suppresses registered combo actions.
- `config-system`: new `gamepadHotkey` default for the item-check widget with a `configVersion` migration.

## Impact

- Code: `renderer/src/web/overlay/gamepad/navigation.ts` (ring re-apply), `renderer/src/web/item-check/widget.ts` + `renderer/src/web/Config.ts` (default combo + migration bump), `main/src/shortcuts/Shortcuts.ts` (gamepad-initiated pin, capture-mode combo suppression, debug logging of forwarded buttons).
- Upstream mergeability: all touched files already carry fork-specific gamepad/config blocks that this change extends in place; no upstream code is restructured. `Config.ts` migration and `widget.ts` defaults follow the existing fork-localized pattern.
- Gamepad feature: this is a direct fix of it; existing defaults (price check `R3 + RT`, locked `L3 + RT`) and the B-button chain semantics are unchanged. Linux (X11/Wayland): the KWin bridge flow benefits directly (map check is the primary Wayland use of item copy); no new platform-specific code.
- No new dependencies.

## Out of Scope

- Navigation for the trade webview, on-screen keyboard, rumble, virtual cursor (Phase 4).
- Left-stick drift/calibration handling beyond the existing dead-zone setting.
- Rebinding keyboard equivalents; changing the widget menu or price check navigation behavior.
- Pass-through (passive) gamepad forwarding to widgets other than the pinned flow above — the game keeps the pad while the overlay is passive.
