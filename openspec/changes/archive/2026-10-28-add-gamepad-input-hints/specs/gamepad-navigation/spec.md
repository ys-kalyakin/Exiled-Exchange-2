# Spec Delta

## ADDED Requirements

### Requirement: Adaptive input hints in the price check window
While the price check window is shown, it SHALL display an input hint bar only after the navigation layer has dispatched at least one intent since the window was last shown. The bar SHALL reflect the source of the most recent dispatched intent, gamepad or keyboard, and SHALL switch immediately when the other source dispatches. The bar SHALL hide when the window hides, and a newly shown window SHALL start with the bar hidden again.

#### Scenario: Hidden until the first intent
- **WHEN** the price check window is shown and the user has only used the mouse in it
- **THEN** no hint bar is displayed

#### Scenario: Appears on the first gamepad intent
- **WHEN** the user presses d-pad down (or any other mapped gamepad button) in a freshly shown window
- **THEN** the hint bar appears showing the gamepad button hints

#### Scenario: Switches to keyboard hints
- **WHEN** the hint bar is showing gamepad hints and the user presses ArrowDown
- **THEN** the bar switches to the keyboard hints (arrows move focus, Enter activates)

#### Scenario: Switches back to gamepad
- **WHEN** the bar shows keyboard hints and the user presses a mapped gamepad button
- **THEN** the bar switches back to the gamepad hints

#### Scenario: Shortcut action wakes the bar
- **WHEN** the user presses X in a freshly shown window without navigating first
- **THEN** the search executes and the hint bar appears showing the gamepad hints

#### Scenario: Hidden state resets per show
- **WHEN** the hint bar is visible, the window closes, and a new price check is opened
- **THEN** the bar is hidden again until the next gamepad or keyboard intent

### Requirement: Hint bar content follows the configured assignments
The hint bar's gamepad mode SHALL list the buttons with their configured intents from the gamepad navigation configuration, so a remapped button always shows its current assignment, and a button assigned none SHALL NOT be listed. Movement SHALL be represented as a single hint for the directional input. The keyboard mode SHALL show the fixed hints: arrows move the focus and Enter activates. Labels SHALL use the same localized intent labels as the gamepad settings page.

#### Scenario: Default assignment chips
- **WHEN** the hint bar shows gamepad hints under the default configuration
- **THEN** the chips match the default map: A activates, B goes back, X searches, Y toggles the browser, LB switches preset, RB jumps a filter section, alongside the movement hint

#### Scenario: Remapped button is reflected
- **WHEN** the user reassigns X from search to preset in the settings and the hint bar shows gamepad hints
- **THEN** the X chip shows the preset action, not search

#### Scenario: Unmapped button is not listed
- **WHEN** a button is assigned none in the configuration
- **THEN** that button has no chip in the hint bar

#### Scenario: Keyboard hints are fixed
- **WHEN** the bar shows keyboard hints
- **THEN** it lists the arrow keys as movement and Enter as activation, regardless of configuration
