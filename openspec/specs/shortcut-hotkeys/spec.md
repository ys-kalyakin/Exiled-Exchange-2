# shortcut-hotkeys Specification

## Purpose
Registers and dispatches global hotkeys while the game is active (main process, `main/src/shortcuts/Shortcuts.ts`), including gamepad combinations — the fork's feature built on `gamepad-io` with the 8BitDo Pro 2 profile. Shortcut entries come from the renderer config (`ShortcutAction` in `ipc/types.ts`).

## Requirements

### Requirement: Registration lifecycle tied to game focus
The `Shortcuts` class SHALL register all configured shortcuts when the game window becomes active and SHALL unregister all of them when it becomes inactive.

#### Scenario: Game window activates
- **WHEN** the game window emits `active-change` with `isActive: true`
- **THEN** all shortcut actions are registered globally; on `isActive: false` they are all unregistered

### Requirement: Wayland shortcut transport
On the Wayland backend the app SHALL register global hotkeys through the compositor integration and SHALL receive their activations over the platform bridge, gated on game-window focus the same way as on other platforms. Changing a hotkey in the settings SHALL re-register it.

#### Scenario: Hotkey fires while game is active
- **WHEN** a compositor-registered shortcut is triggered while the game window is active
- **THEN** the corresponding action dispatch runs exactly as on other platforms

#### Scenario: Hotkey fires while game is inactive
- **WHEN** a compositor-registered shortcut is triggered while the game window is not active
- **THEN** the activation is ignored and no action dispatch runs

### Requirement: Reserved and duplicate hotkey handling
The class SHALL NOT register hotkeys reserved by the game (Ctrl+C/V/A/F, Ctrl+Enter, Home, Delete, Enter, arrows, and the merged copy-item shortcut) and SHALL log an error for each; SHALL filter duplicate shortcuts, keeping duplicates only for `toggle-overlay` actions.

#### Scenario: User binds Ctrl+C
- **WHEN** an action is configured with shortcut `Ctrl + C`
- **THEN** it is not registered and an error line is written to the log

### Requirement: Mod key release before actions
Before dispatching an action the class SHALL release the combo keys from the OS perspective: with `keepModKeys` only the non-mod key is toggled up; otherwise every key of the combo is toggled up in reverse order.

#### Scenario: copy-item with keepModKeys
- **WHEN** a `copy-item` action with `keepModKeys: true` fires
- **THEN** only the non-mod key (e.g. `D`) is released, modifiers stay held so the game receives Ctrl+C

### Requirement: Action dispatch by type
The handler SHALL dispatch by `action.type`: `toggle-overlay`, `paste-in-chat`, `trigger-event` (widget-action broadcast), `stash-search`, `copy-item`, `ocr-text` with target `heist-gems` (Windows only), and `test-only` (registered, then immediately unregistered). Injection actions (`copy-item`, `paste-in-chat`, `stash-search`) SHALL dispatch only when input injection is available on the platform; without a helper on Wayland they SHALL be disabled with a user-visible notice.

#### Scenario: stash-search action
- **WHEN** a `stash-search` shortcut fires
- **THEN** the stash search flow runs with the configured text

#### Scenario: copy-item without injection helper on Wayland
- **WHEN** a `copy-item` shortcut fires on the Wayland backend while no injection helper is available
- **THEN** the action is not dispatched and the user sees a notice naming the missing injection helper

### Requirement: Gamepad combinations
For entries with `gamepadCombo` the class SHALL register the combination on a `gamepad-io` Gamepad instance created from `gamepadConfigs.eightBitDoPro2`: `COMBO_DOWN` SHALL invoke the same handler as the keyboard shortcut; the gamepad B button SHALL toggle the overlay active state; and for `copy-item` actions with `focusOverlay === false`, `COMBO_UP` SHALL toggle the overlay active state.

#### Scenario: Price check from gamepad
- **WHEN** the user presses the combo bound to price check (`R3 + RT` by default)
- **THEN** the copy-item handler runs exactly as if the keyboard hotkey were pressed, and on combo release the overlay activates

#### Scenario: B button
- **WHEN** the user presses the gamepad B button while shortcuts are registered
- **THEN** the overlay switches between pass-through and interactive state

### Requirement: Reserved copy-item probe
The class SHALL merge `Ctrl + C` with the game's show-mods key into a `test-only` action used to probe reserved hotkeys, and SHALL not register it permanently.

#### Scenario: Show-mods key set
- **WHEN** the game config defines `showModsKey` (e.g. Ctrl + Alt + C)
- **THEN** a merged probe shortcut is created for detection and unregistered immediately
