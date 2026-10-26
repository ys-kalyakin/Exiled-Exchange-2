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

### Requirement: Navigable windows beyond price check
The renderer SHALL register the settings window, the item-check widget (map check and plain item info), and the widget menu as navigable scopes, and SHALL register the remaining widgets that contain controls (item search, stash search, notepad, stopwatch, library, image strip) so their controls are reachable from the pad. Navigation intents SHALL be delivered to the topmost shown registered window as today; windows that are not registered SHALL remain non-navigable.

#### Scenario: Settings window receives navigation
- **WHEN** the settings window is the topmost shown window and the user presses d-pad down
- **THEN** focus is placed inside the settings window (its menu and controls participate in navigation)

#### Scenario: Map check widget receives navigation
- **WHEN** the map check widget is shown and the user presses d-pad down
- **THEN** focus is placed on the first navigable row of the map check widget (profile buttons or the first stat row)

#### Scenario: Widget menu receives navigation
- **WHEN** the overlay is active with the widget menu as the only shown window and the user presses d-pad down
- **THEN** focus is placed on a widget toggle button of the menu

#### Scenario: Unregistered surface stays inert
- **WHEN** the topmost shown window is a widget without any navigable scope and the user presses a directional button
- **THEN** no focus indicator appears and no window reacts

### Requirement: DOM-derived rows for windows without markers
Scopes that opt in to DOM-derived rows SHALL be navigable without `data-gp-row` markers: the focus engine SHALL group visible, enabled controls by their nearest common container into rows. Explicit `data-gp-row` markers, where present in such a window, SHALL take precedence over the synthesized grouping.

#### Scenario: Settings page without markers
- **WHEN** a settings page renders only plain layout containers around its controls and the user navigates with d-pad down
- **THEN** each group of controls sharing a container is focused as one row, moving through the page in document order

#### Scenario: Marked rows keep precedence
- **WHEN** a scope with DOM-derived rows also contains a `data-gp-row` element
- **THEN** that element is used as one row as-is instead of being re-grouped by the synthesized grouping

#### Scenario: Price check behavior unchanged
- **WHEN** the price check window (which relies on explicit markers only) is navigated
- **THEN** its rows and controls are exactly as before this change

### Requirement: Focused control scrolling
When the focused control lies outside the visible area of a scrollable container, moving focus to it SHALL scroll it into view (nearest edge), so navigation works in windows taller than the viewport.

#### Scenario: Settings pane scrolls to the focused control
- **WHEN** focus moves to a control below the visible area of the settings page pane
- **THEN** the pane scrolls just enough to show the focused control

### Requirement: Navigation suppressed during combo capture
While a gamepad combo capture is armed (a binding input in the settings window is recording), gamepad buttons SHALL NOT produce navigation intents; keyboard navigation SHALL be unaffected. When the capture ends or times out, gamepad navigation SHALL resume.

#### Scenario: D-pad press while capturing a combo
- **WHEN** a combo capture is armed and the user presses d-pad buttons to record a combo
- **THEN** the focus in the settings window does not move and no control is activated

#### Scenario: Navigation resumes after capture
- **WHEN** the capture commits (or is cancelled or times out) and the user presses d-pad down
- **THEN** gamepad navigation moves the focus as usual

### Requirement: Back chain closes the newly navigable windows
On the B button, the topmost open popover SHALL close first. Otherwise the B button SHALL close the topmost navigable window the same way as its own close control: the item-check widget (map check or item info) is hidden, the settings window is closed as Cancel. A window without its own close control (the widget menu) SHALL NOT be closed by B; the back chain falls through to requesting main to unpin the overlay.

#### Scenario: B hides the map check widget
- **WHEN** the map check widget is shown, no popover is open, and the user presses B
- **THEN** the map check widget is hidden exactly as when its own close button is pressed, and the overlay stays pinned

#### Scenario: B cancels the settings window
- **WHEN** the settings window is shown and the user presses B
- **THEN** the settings window closes as when its own close (Cancel) control is pressed

#### Scenario: B over the widget menu unpins the overlay
- **WHEN** only the widget menu is shown, no popover is open, and the user presses B
- **THEN** the renderer requests main to unpin the overlay and the menu stays shown

#### Scenario: B closes the menu popover first
- **WHEN** the widget menu's add-widget popover is open and the user presses B
- **THEN** the popover closes and the menu stays shown


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
