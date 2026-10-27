# Spec Delta

## MODIFIED Requirements

### Requirement: Gamepad event forwarding while overlay is active
While the overlay is in the interactive (active) state, main SHALL forward gamepad button press and release events to connected clients as a `MAIN->CLIENT::gamepad-input` event carrying the raw button name and the phase (`down` or `up`). While the overlay is not active, no button events SHALL be forwarded. Buttons that participate in a registered shortcut combination SHALL NOT be forwarded, except while gamepad capture mode is active (see the shortcut-hotkeys specification).

#### Scenario: D-pad press with active overlay
- **WHEN** the overlay is active and the user presses the d-pad down button
- **THEN** clients receive a gamepad-input event with button `DPAD_DOWN` and phase `down`, and later an event with phase `up`

#### Scenario: Passive overlay
- **WHEN** the overlay is in pass-through state and the user presses any non-combo gamepad button
- **THEN** no gamepad-input event is emitted

#### Scenario: Combo participant button
- **WHEN** the user presses a button that is part of a registered gamepad combination (for example `RT` of `R3 + RT`)
- **THEN** that button's press and release are not forwarded as gamepad-input events

#### Scenario: Combo participant during capture mode
- **WHEN** gamepad capture mode is enabled (settings window shown) and the user presses `RT`
- **THEN** the press and release are forwarded as gamepad-input events despite participating in a combination

### Requirement: Shared navigation intent layer
The renderer SHALL process gamepad-input events and keyboard directional keys through a single navigation-intent layer, so gamepad and keyboard produce the same navigation behavior. Directional input held beyond an initial delay SHALL auto-repeat at a fixed interval until released. The button-to-intent assignment, the repeat delay and interval, and whether gamepad navigation is enabled SHALL come from the renderer configuration; the keyboard bindings SHALL stay fixed.

#### Scenario: Gamepad and keyboard produce the same movement
- **WHEN** the user presses d-pad down on the gamepad, and separately the keyboard ArrowDown, in the same window state
- **THEN** both inputs move the focus one row down

#### Scenario: Held direction repeats
- **WHEN** the user holds d-pad down (or keyboard ArrowDown)
- **THEN** focus movement repeats after the configured repeat delay and continues at the configured repeat interval until release

#### Scenario: Configured button assignment
- **WHEN** the configuration assigns an intent to a button that previously had none (or removes a default assignment)
- **THEN** navigation follows the configured assignment after the config is saved

#### Scenario: Navigation disabled
- **WHEN** gamepad navigation is disabled in the configuration and the user presses a d-pad button while the overlay is active
- **THEN** no focus indicator appears and no gamepad input moves focus; keyboard arrows keep working

### Requirement: Two-level focus navigation in price check
Within the price check window, up/down SHALL move focus between filter rows and left/right SHALL move focus between the controls of the current row, in the order declared by the window's content. Navigation SHALL be lazy: opening the window SHALL NOT display a focus indicator, and the first directional press SHALL place focus on the remembered row for the shown item (see Focus memory), or on the first row when nothing is remembered.

#### Scenario: First press enters navigation
- **WHEN** the price check window opens and the user presses d-pad down for the first time
- **THEN** focus is placed on the first filter row and the focus indicator becomes visible

#### Scenario: Moving within a row
- **WHEN** a filter row with several controls (checkbox, numeric inputs, dropdown) is focused and the user presses d-pad right
- **THEN** focus moves to the next control of the same row, and d-pad left moves back

#### Scenario: Reaching the end of rows
- **WHEN** the last navigable row (including the Search control) is focused and the user presses d-pad down
- **THEN** focus stays on the last row

## ADDED Requirements

### Requirement: Shortcut button actions
The navigation layer SHALL support shortcut action intents besides movement, activation and back. The default assignments SHALL be: X executes the price check Search, Y toggles the trade browser, LB switches to the next price-check preset (wrapping around), and RB jumps to the first row of the next filter section (wrapping around). Action intents SHALL be delivered to the topmost navigable window regardless of whether navigation focus is engaged.

#### Scenario: X executes Search
- **WHEN** the price check window is shown with a parsed item and the user presses X without having navigated first
- **THEN** the search executes exactly as if the Search button were clicked

#### Scenario: Y toggles the trade browser
- **WHEN** the price check window is shown and the user presses Y twice
- **THEN** the built-in trade browser opens on the first press and closes on the second

#### Scenario: LB switches the preset
- **WHEN** the parsed item has more than one filter preset and the user presses LB repeatedly
- **THEN** each press activates the next preset, wrapping around to the first

#### Scenario: RB jumps a filter section
- **WHEN** the item has several filter sections and the user presses RB
- **THEN** focus (or the view) lands on the first row of the next filter section, wrapping around after the last

#### Scenario: Button mapped to none
- **WHEN** a button is assigned none in the configuration and the user presses it while the overlay is active
- **THEN** no intent is produced and nothing happens

### Requirement: Left stick navigation
While the overlay is active, left-stick deflection beyond the configured dead-zone SHALL produce the same directional intents as the corresponding d-pad direction, re-triggering while the stick stays deflected past the dead-zone. Returning the stick inside the dead-zone SHALL stop the movement.

#### Scenario: Stick held down
- **WHEN** the user holds the left stick past the dead-zone in the down direction
- **THEN** focus moves one row down and keeps stepping while the stick is held

#### Scenario: Stick returned to center
- **WHEN** the user releases the stick back inside the dead-zone
- **THEN** the movement stops

### Requirement: Focus memory
Navigation SHALL remember the last focused row per navigable window across hide/show, keyed by the window's focus key (for the price check window, the item type of the shown item). When a remembered window is shown again, the first directional press SHALL restore focus on the remembered row index, clamped to the current number of rows, instead of the first row. The memory SHALL be kept in memory only and lost on app restart.

#### Scenario: Reopen the same item type
- **WHEN** the user navigates to row 5 of a ring price check, closes the window, and price-checks another ring
- **THEN** the first directional press places focus on row 5

#### Scenario: Different item type
- **WHEN** the user navigates to row 5 of a ring price check and then price-checks a gem
- **THEN** the first directional press places focus on the first row

#### Scenario: Remembered row no longer exists
- **WHEN** the remembered row index exceeds the rows of the reopened window
- **THEN** focus lands on the last row
