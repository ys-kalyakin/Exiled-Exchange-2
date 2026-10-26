# gamepad-navigation Delta

## ADDED Requirements

### Requirement: Gamepad opening of the map check widget
The item-check widget (map check and plain item info) SHALL be openable from the pad: its widget config carries a gamepad combo (bound through the hotkey editor, non-empty by default) that copies the item under the cursor the same way as its keyboard hotkey. When the copy is triggered by the gamepad combo, the overlay SHALL become interactable, so the pad can navigate the shown widget immediately. The keyboard-triggered flow SHALL keep its current focus behavior.

#### Scenario: Open map check from the pad in game
- **WHEN** the game is focused (the overlay is passive) and the user presses the item-check gamepad combo while pointing at a waystone
- **THEN** the map check widget shows the waystone stats and the overlay is interactable, with no keyboard input involved

#### Scenario: Keyboard flow unchanged
- **WHEN** the user triggers the item-check copy with its keyboard hotkey
- **THEN** the overlay focus behaves exactly as before this change (the widget shows pass-through, the game keeps focus)

#### Scenario: First session
- **WHEN** the overlay has not been used recently in this session and the user presses the item-check gamepad combo
- **THEN** the overlay still becomes interactable (the pin is not suppressed by the recent-use gate)

### Requirement: Map check rows and color activation
Within the shown map check widget, the profile buttons and every recognized stat row SHALL be navigable rows: up/down moves focus between them, left/right moves between the row's controls, and the activation button (gamepad A, keyboard Enter) on a stat row's color button SHALL cycle the row's decision color exactly as a mouse click does. The eye toggle of a stat row SHALL be reachable with left/right and activatable with A.

#### Scenario: Cycle a stat color with A
- **WHEN** a stat row is focused and the user presses A
- **THEN** the row's decision color cycles (normal → good → warn → danger) exactly as when the row is clicked with the mouse

#### Scenario: Reach the eye toggle
- **WHEN** a stat row is focused and the user presses d-pad right
- **THEN** focus moves to the row's eye toggle, and A toggles the seen status

### Requirement: Focus indicator persists across activation
After the activation button activates the focused control, the focus indicator SHALL remain on the control that is still focused, even when the activation re-renders the control with a different class binding (a stat color cycle, a profile selection, a menu toggle). The indicator SHALL only move or clear when focus moves or the window hides.

#### Scenario: Ring survives a color cycle
- **WHEN** a stat row's color button is focused and the user presses A to cycle the color
- **THEN** the focus ring stays visible on that button after the row re-renders with its new color class

#### Scenario: Ring survives a settings page switch
- **WHEN** a settings menu entry is focused and the user presses A
- **THEN** the focus ring stays visible on that entry after it re-renders with the active class
