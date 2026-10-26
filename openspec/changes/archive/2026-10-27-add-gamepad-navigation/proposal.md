# Proposal

## Why

The fork already opens the overlay with gamepad hotkeys (`gamepad-io` combos, B button), but once a window is open the gamepad can do nothing inside it: price check filters (checkboxes, dropdowns, numeric inputs, Search) are mouse-only. A gamepad-only user must reach for the mouse for every interaction. This change gives the gamepad first-class navigation inside the price check window.

## What Changes

- Main process (`main/src/shortcuts/Shortcuts.ts`):
  - Restructure gamepad wiring so the `gamepad-io` subscriptions are created once, not per action entry on every game-focus cycle (today `registerCombination` throws on re-registration and `.on` listeners stack — a latent bug that becomes blocking once more listeners are added).
  - Forward raw gamepad button events to the renderer as a new `MAIN->CLIENT::gamepad-input` event while the overlay is active; buttons that participate in registered combos (e.g. `R3`, `RT`) are not forwarded.
  - **BREAKING** (fork behavior): the gamepad B button no longer toggles the overlay globally — while the overlay is inactive, B is left to the game (it previously opened/activated the overlay, which broke in-game use); while the overlay is active, B is forwarded to the renderer, which walks a back chain (close popover → close active window → close overlay).
- Renderer (`renderer/src/web`):
  - A navigation composable: a single input layer that consumes both `MAIN->CLIENT::gamepad-input` events and window `keydown` events, produces navigation intents, and applies auto-repeat for held direction keys.
  - Two-level roving-focus navigation for the price check window: up/down moves between filter rows, left/right moves between the controls of a row; lazy entry (navigation activates on first dpad press, no focus ring on open); activation via programmatic `click()` for buttons/checkboxes and value-stepping for native `<select>`s.
  - `data-gp` group markers in the price check filter components; a `.focused-gamepad` visual focus style.
  - Focus layering through `WidgetManager`: input goes to the topmost active overlay window, not to widgets underneath.
  - Reuse of the existing `OVERLAY->MAIN::focus-game` event to unpin the overlay at the end of the B back chain.

## Capabilities

### New Capabilities
- `gamepad-navigation`: delivering gamepad button events to the renderer while the overlay is active and navigating overlay window UI (price check) with the gamepad: intent layer, focus layers, two-level navigation, back chain, auto-repeat.

### Modified Capabilities
- `shortcut-hotkeys`: the gamepad B button requirement changes (forward-to-renderer when overlay active instead of unconditional toggle) and the gamepad registration lifecycle requirement changes (subscriptions created once, combinations re-registered idempotently instead of stacking listeners / throwing on re-register).

## Impact

- Code: `main/src/shortcuts/Shortcuts.ts` (gamepad wiring refactor + B semantics), `ipc/types.ts` (new `MAIN->CLIENT::gamepad-input` event, `user-action` payload extension), new renderer module for the navigation composable and focus-layer registry (e.g. `renderer/src/web/overlay/gamepad/`), wiring in `renderer/src/web/overlay/OverlayWindow.vue` (where `wm` is provided), localized `data-gp` additions in `renderer/src/web/price-check/` components (`PriceCheckWindow.vue`, `CheckedItem.vue`, `filters/*.vue`), shared CSS for `.focused-gamepad`.
- No new dependencies: reuses `gamepad-io` (main) and the existing WebSocket event bus.
- Upstream mergeability: touches files shared with upstream (`Shortcuts.ts`, `ipc/types.ts`, price check components). Fork edits stay minimal and localized per project constraints: `Shortcuts.ts` already contains fork-specific gamepad blocks that this change restructures in place; renderer components receive only attribute/markup-level additions; all new logic lives in new fork-owned files.
- Gamepad feature: this is an extension of the fork's gamepad feature; the global-combo behavior (`R3 + RT` price check, `L3 + RT` locked price check, B opens a passive overlay) is preserved. Linux support: unaffected and equally supported — the transport is the platform-independent event bus; no new platform-specific code for Windows, X11, or Wayland.

## Out of Scope

- Gamepad input into the trade-site webview.
- Text input via gamepad (no on-screen keyboard).
- Navigation support for other windows (map check, widgets, item editor, settings UI): the mechanism is built reusable, but only price check is populated with markers in this change.
- Configurable button mapping or an on/off setting (hardcoded map in renderer, marked as future-configurable).
- Shortcut buttons (X/Y/LB/RB) and stick navigation; dpad + A + B only.
