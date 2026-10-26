# gamepad-navigation Specification

## Purpose
Delivers raw gamepad button events from the main process (`main/src/shortcuts/Shortcuts.ts`) to the renderer over the event bus while the overlay is active, and provides gamepad (and keyboard) navigation inside overlay windows (`renderer/src/web`), starting with the price check window: a shared input-intent layer, focus layering, two-level focus movement, control activation, and a back chain on the B button.

## Requirements

### Requirement: Gamepad event forwarding while overlay is active
While the overlay is in the interactive (active) state, main SHALL forward gamepad button press and release events to connected clients as a `MAIN->CLIENT::gamepad-input` event carrying the raw button name and the phase (`down` or `up`). While the overlay is not active, no button events SHALL be forwarded. Buttons that participate in a registered shortcut combination SHALL NOT be forwarded.

#### Scenario: D-pad press with active overlay
- **WHEN** the overlay is active and the user presses the d-pad down button
- **THEN** clients receive a gamepad-input event with button `DPAD_DOWN` and phase `down`, and later an event with phase `up`

#### Scenario: Passive overlay
- **WHEN** the overlay is in pass-through state and the user presses any non-combo gamepad button
- **THEN** no gamepad-input event is emitted

#### Scenario: Combo participant button
- **WHEN** the user presses a button that is part of a registered gamepad combination (for example `RT` of `R3 + RT`)
- **THEN** that button's press and release are not forwarded as gamepad-input events

### Requirement: Shared navigation intent layer
The renderer SHALL process gamepad-input events and keyboard directional keys through a single navigation-intent layer, so gamepad and keyboard produce the same navigation behavior. Directional input held beyond an initial delay SHALL auto-repeat at a fixed interval until released.

#### Scenario: Gamepad and keyboard produce the same movement
- **WHEN** the user presses d-pad down on the gamepad, and separately the keyboard ArrowDown, in the same window state
- **THEN** both inputs move the focus one row down

#### Scenario: Held direction repeats
- **WHEN** the user holds d-pad down (or keyboard ArrowDown)
- **THEN** focus movement repeats after the initial delay and continues at the repeat interval until release

### Requirement: Focus layer selection
Navigation intents SHALL be delivered only to the topmost active overlay window as tracked by the widget manager. Windows underneath or hidden windows SHALL NOT react to navigation input.

#### Scenario: Price check over a widget
- **WHEN** the price check window is open above other overlay widgets and the user presses d-pad down
- **THEN** only the price check window moves focus; underlying widgets are unaffected

### Requirement: Two-level focus navigation in price check
Within the price check window, up/down SHALL move focus between filter rows and left/right SHALL move focus between the controls of the current row, in the order declared by the window's content. Navigation SHALL be lazy: opening the window SHALL NOT display a focus indicator, and the first directional press SHALL place focus on the first row.

#### Scenario: First press enters navigation
- **WHEN** the price check window opens and the user presses d-pad down for the first time
- **THEN** focus is placed on the first filter row and the focus indicator becomes visible

#### Scenario: Moving within a row
- **WHEN** a filter row with several controls (checkbox, numeric inputs, dropdown) is focused and the user presses d-pad right
- **THEN** focus moves to the next control of the same row, and d-pad left moves back

#### Scenario: Reaching the end of rows
- **WHEN** the last navigable row (including the Search control) is focused and the user presses d-pad down
- **THEN** focus stays on the last row

### Requirement: Focus indicator and activation
The focused control SHALL be visually indicated by a dedicated focus class. The activation button (gamepad A, keyboard Enter) SHALL activate the focused control: a click for buttons and checkboxes, and a programmatic value change with a change event for native select elements, whose option list SHALL be stepped with left/right instead of opened.

#### Scenario: Toggle a filter checkbox
- **WHEN** a filter checkbox is focused and the user presses A
- **THEN** the checkbox toggles exactly as with a mouse click and the filter updates

#### Scenario: Step a dropdown value
- **WHEN** a native select is focused and the user presses d-pad left or d-pad right
- **THEN** the select's value changes to the previous or next option and a change event is dispatched; the native dropdown popup does not open

#### Scenario: Activate Search
- **WHEN** the Search control is focused and the user presses A
- **THEN** the search executes exactly as if clicked with the mouse

### Requirement: Back chain on the B button
While the overlay is active, the B button SHALL close the topmost closeable target: an open popover, otherwise the active overlay window, closed the same way as its own close button. If no popover or window can be closed, the renderer SHALL request main to close (unpin) the overlay.

#### Scenario: Close a popover
- **WHEN** a popover is open in the price check window and the user presses B
- **THEN** the popover closes and the window stays open

#### Scenario: Close the price check window
- **WHEN** no popover is open, the price check window is shown, and the user presses B
- **THEN** the price check window closes exactly as when its close button is pressed (in the default configuration this returns focus to the game and unpins the overlay)

#### Scenario: Unpin the overlay
- **WHEN** the overlay is active with no popover and no closable window, and the user presses B
- **THEN** the renderer sends a close-overlay request to main and the overlay returns to pass-through state

### Requirement: Focus index stability on content change
When the focused control is removed from the DOM (for example after a filter change re-renders the list), the navigation index SHALL clamp to the nearest remaining control instead of pointing outside the navigable set.

#### Scenario: Focused checkbox disappears
- **WHEN** the focused checkbox row is removed after a filter change and the user presses a direction key
- **THEN** focus lands on the nearest remaining row in the movement direction
