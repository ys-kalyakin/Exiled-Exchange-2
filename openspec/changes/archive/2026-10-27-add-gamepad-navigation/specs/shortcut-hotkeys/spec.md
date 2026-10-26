# Spec Delta

## MODIFIED Requirements

### Requirement: Gamepad combinations
For entries with `gamepadCombo` the class SHALL register the combination on a single `gamepad-io` Gamepad instance created from `gamepadConfigs.eightBitDoPro2`. Gamepad event subscriptions SHALL be created once for the lifetime of the class, and re-registration when shortcuts re-register SHALL be idempotent: no duplicate event listeners and no failures when a combination is already registered. `COMBO_DOWN` SHALL invoke the same handler as the keyboard shortcut; for `copy-item` actions with `focusOverlay === false`, `COMBO_UP` SHALL assert the overlay active (pin it without toggling), because the item copy runs while the overlay is passive and a toggle would unpin an already active overlay. The gamepad B button SHALL NOT change the overlay active state: while the overlay is active the B press SHALL be forwarded to the renderer for in-window navigation, and while the overlay is inactive B SHALL have no effect in the app so the game keeps exclusive use of the button.

#### Scenario: Price check from gamepad
- **WHEN** the user presses the combo bound to price check (`R3 + RT` by default)
- **THEN** the copy-item handler runs exactly as if the keyboard hotkey were pressed, and on combo release the overlay activates

#### Scenario: Game focus cycles
- **WHEN** the game window loses and regains focus so shortcuts re-register
- **THEN** each gamepad combination still fires exactly once per press and no duplicate listeners accumulate

#### Scenario: B button
- **WHEN** the user presses the gamepad B button while the overlay is inactive
- **THEN** the overlay active state does not change and the game receives the button press

#### Scenario: B button with active overlay
- **WHEN** the user presses the gamepad B button while the overlay is active
- **THEN** the press is forwarded to the renderer as a gamepad input event and main does not change the overlay active state
