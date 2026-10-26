# Proposal: Gamepad navigation in the remaining overlay windows

## Why

Gamepad navigation (v1, `add-gamepad-navigation`) works only in the price check window: it is the sole window that registers a `GamepadNavScope`, so every other overlay surface — the settings window, map check, the widget menu, and the smaller widgets — is unreachable from the pad. The fork's gamepad roadmap (Phase 3, `docs/gamepad-roadmap.md`) names exactly these windows as the next step, and the widget menu is the entry point to everything else, so without it a pad-only user cannot even open the settings.

## What Changes

- Register the settings window, the item-check widget (map check and plain item info), and the widget menu as navigable gamepad scopes, wired through the existing `useGamepadNavScope` mechanism.
- Add a generic DOM-derived row synthesis to the focus engine for scopes without explicit `data-gp-row` markers, so the large settings window (many upstream-owned page components) becomes navigable without editing every settings page. Scopes may keep or mix in explicit markers (map check stat rows, widget menu buttons).
- Scroll the focused control into view (`scrollIntoView`, nearest) so navigation works in scrollable containers such as the settings pane.
- Suppress gamepad navigation intents while the gamepad combo capture mode is armed (a binding input in the settings window is recording buttons), so capturing a combo no longer moves focus or activates controls.
- Extend the B-button back chain per window type: widgets close like their own close control (e.g. `wm.hide` for map check, Cancel for settings), falling through to unpinning the overlay as today.
- Register scopes for the remaining simple widgets where they have navigable controls (item search, stash search, notepad, stopwatch, delve grid, library) using the generic mechanism.

Out of scope (stays as today or future work): text entry via an on-screen keyboard (roadmap Phase 4), trade results navigation inside the price check browser, virtual cursor, rumble, changes to the main-process event forwarding gating, new config options, and any behavior change for the keyboard intent path beyond what the shared intent layer already provides.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `gamepad-navigation`: the focus-layer requirement is extended from "only the price check window is a scope" to a set of navigable windows; new requirements for DOM-derived row synthesis (windows without markers), scrolling the focused control into view, suppression during combo capture, and per-window close semantics on the B button.

## Impact

- **Renderer** (`renderer/src/web`): `overlay/gamepad/focusEngine.ts` and `navigation.ts` (row synthesis, scroll-into-view, capture suppression); scope registration in `settings/SettingsWindow.vue`, `item-check/WidgetItemCheck.vue`, `overlay/WidgetMenu.vue`, and the simple widget components; `settings/GamepadComboInput.vue` (publish capture state to the gamepad module).
- **Upstream mergeability**: touches upstream-shared files (settings/widget components) only to add scope registration and occasionally `data-gp-*` attributes — the same, localized pattern v1 used for the price check filter components. The generic row synthesis exists precisely to avoid spreading markers across every settings page. New logic lives in fork-owned `renderer/src/web/overlay/gamepad/`.
- **Gamepad feature**: extends it; the price check behavior is unchanged, and the gamepad feature must keep compiling and working (fork constraint).
- **Linux (X11) / Wayland**: no platform-specific code paths affected; the input transport (`MAIN->CLIENT::gamepad-input`/`gamepad-axis`) is unchanged, so behavior is identical on X11, KWin Wayland, and Windows.
- **Main process / dataParser**: untouched.
