# Spec Delta

## MODIFIED Requirements

### Requirement: Gamepad combination registration
For entries with `gamepadCombo` the class SHALL register the combination on a single `gamepad-io` Gamepad instance created from `gamepadConfigs.eightBitDoPro2`. Gamepad event subscriptions SHALL be created once for the lifetime of the class, and re-registration when shortcuts re-register SHALL be idempotent: no duplicate event listeners and no failures when a combination is already registered. The `gamepadCombo` of an entry SHALL come from the renderer configuration (the widget config owning the entry) instead of being hardcoded. When shortcuts re-register, combinations no longer present in the current actions SHALL be unregistered.

#### Scenario: Game focus cycles
- **WHEN** the game window loses and regains focus so shortcuts re-register
- **THEN** each gamepad combination still fires exactly once per press and no duplicate listeners accumulate

#### Scenario: Combo rebind
- **WHEN** the user changes the price-check gamepad combo from `R3 + RT` to `R3 + LT` and presses each combo
- **THEN** the new combo triggers the price check action and the old combo triggers nothing

#### Scenario: Cleared combo
- **WHEN** the user clears the gamepad combo of a shortcut entry
- **THEN** no combination is registered for it and its former buttons are no longer filtered from forwarding

## ADDED Requirements

### Requirement: Gamepad capture mode for combo binding
The renderer SHALL notify main to enable gamepad capture mode while the settings window is shown, and to disable it when the settings window hides. While capture mode is enabled, main SHALL forward every gamepad button press and release to the renderer, including buttons that participate in registered shortcut combinations, so a binding UI can record pressed buttons directly. While capture mode is disabled, the combo-participant filter SHALL apply again.

#### Scenario: Capture while settings is shown
- **WHEN** the settings window is shown and the user presses `RT` (a default combo participant)
- **THEN** the press and release are forwarded to the renderer as gamepad-input events

#### Scenario: Capture ends with the settings window
- **WHEN** the settings window hides
- **THEN** combo participant buttons are no longer forwarded as gamepad-input events

### Requirement: Gamepad stick forwarding
While the overlay is in the interactive (active) state, main SHALL forward left-stick deflection to connected clients as `MAIN->CLIENT::gamepad-axis` events carrying the normalized x and y axis values (each in [-1, 1]). While the overlay is not active, no axis events SHALL be forwarded. Axis values SHALL be forwarded unfiltered; dead-zone handling is the renderer's (gamepad-navigation specification).

#### Scenario: Stick deflection with active overlay
- **WHEN** the overlay is active and the user pushes the left stick
- **THEN** clients receive gamepad-axis events with the stick's normalized x and y values

#### Scenario: Passive overlay
- **WHEN** the overlay is in pass-through state and the user moves the left stick
- **THEN** no gamepad-axis event is emitted
