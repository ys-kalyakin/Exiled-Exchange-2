# shortcut-hotkeys Delta

## ADDED Requirements

### Requirement: Gamepad-triggered copy pins the overlay
When a `copy-item` action with `focusOverlay` is dispatched from a gamepad combination, the overlay SHALL become interactable after the item text is delivered, regardless of whether the overlay was used recently. Keyboard-triggered copies SHALL keep the existing recent-use gate.

#### Scenario: Pad-triggered copy on a fresh session
- **WHEN** the overlay has not been used recently and the user triggers the item-check copy with its gamepad combination
- **THEN** the overlay becomes interactable and the pad can navigate the shown window

#### Scenario: Keyboard copy keeps the gate
- **WHEN** the overlay has not been used recently and the user triggers the item-check copy with its keyboard hotkey
- **THEN** the overlay focus behavior is unchanged (no forced pin)

### Requirement: Capture mode suppresses combo actions
While capture mode is on (the settings window is shown for combo binding), registered gamepad combinations SHALL NOT execute their shortcut actions; their buttons SHALL still be forwarded to clients as raw gamepad-input events. When capture mode ends, the combinations SHALL execute again.

#### Scenario: Price check combo does not fire in settings
- **WHEN** the settings window is shown (capture mode on) and the user presses the price-check combination `R3 + RT`
- **THEN** no shortcut action runs, the settings window stays shown and topmost, and the renderer receives the raw `R3` and `RT` button events

#### Scenario: Combos work again after settings closes
- **WHEN** the settings window is closed (capture mode off) and the user presses `R3 + RT` over an item
- **THEN** the price check action executes as usual
