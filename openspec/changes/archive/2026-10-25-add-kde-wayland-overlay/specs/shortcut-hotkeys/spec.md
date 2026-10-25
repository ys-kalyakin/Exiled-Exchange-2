# Spec Delta

## ADDED Requirements

### Requirement: Wayland shortcut transport
On the Wayland backend the app SHALL register global hotkeys through the compositor integration and SHALL receive their activations over the platform bridge, gated on game-window focus the same way as on other platforms. Changing a hotkey in the settings SHALL re-register it.

#### Scenario: Hotkey fires while game is active
- **WHEN** a compositor-registered shortcut is triggered while the game window is active
- **THEN** the corresponding action dispatch runs exactly as on other platforms

#### Scenario: Hotkey fires while game is inactive
- **WHEN** a compositor-registered shortcut is triggered while the game window is not active
- **THEN** the activation is ignored and no action dispatch runs

## MODIFIED Requirements

### Requirement: Action dispatch by type
The handler SHALL dispatch by `action.type`: `toggle-overlay`, `paste-in-chat`, `trigger-event` (widget-action broadcast), `stash-search`, `copy-item`, `ocr-text` with target `heist-gems` (Windows only), and `test-only` (registered, then immediately unregistered). Actions that inject input into the game (`copy-item`, `paste-in-chat`, `stash-search`) SHALL be dispatched only when input injection is available on the platform; on the Wayland backend without an injection helper they SHALL be disabled with a user-visible notice.

#### Scenario: stash-search action
- **WHEN** a `stash-search` shortcut fires
- **THEN** the stash search flow runs with the configured text

#### Scenario: copy-item without injection helper on Wayland
- **WHEN** a `copy-item` shortcut fires on the Wayland backend while no injection helper is available
- **THEN** the action is not dispatched and the user sees a notice naming the missing injection helper
