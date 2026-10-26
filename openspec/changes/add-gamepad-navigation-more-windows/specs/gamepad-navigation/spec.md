# gamepad-navigation Delta

## ADDED Requirements

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
