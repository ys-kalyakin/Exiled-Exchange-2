# shortcut-hotkeys Specification

## Purpose
Registers and dispatches global hotkeys while the game is active (main process, `main/src/shortcuts/Shortcuts.ts`), including gamepad combinations — the fork's feature built on `gamepad-io` with the 8BitDo Pro 2 profile. Shortcut entries come from the renderer config (`ShortcutAction` in `ipc/types.ts`).

## Requirements

### Requirement: Registration lifecycle tied to game focus
The `Shortcuts` class SHALL register all configured shortcuts when the game window becomes active and SHALL unregister all of them when it becomes inactive.

#### Scenario: Game window activates
- **WHEN** the game window emits `active-change` with `isActive: true`
- **THEN** all shortcut actions are registered globally; on `isActive: false` they are all unregistered

### Requirement: Wayland shortcut transport
On the Wayland backend the app SHALL register global hotkeys through the compositor integration and SHALL receive their activations over the platform bridge, gated on game-window focus the same way as on other platforms. Changing a hotkey in the settings SHALL re-register it.

#### Scenario: Hotkey fires while game is active
- **WHEN** a compositor-registered shortcut is triggered while the game window is active
- **THEN** the corresponding action dispatch runs exactly as on other platforms

#### Scenario: Hotkey fires while game is inactive
- **WHEN** a compositor-registered shortcut is triggered while the game window is not active
- **THEN** the activation is ignored and no action dispatch runs

### Requirement: Reserved and duplicate hotkey handling
The class SHALL NOT register hotkeys reserved by the game (Ctrl+C/V/A/F, Ctrl+Enter, Home, Delete, Enter, arrows, and the merged copy-item shortcut) and SHALL log an error for each; SHALL filter duplicate shortcuts, keeping duplicates only for `toggle-overlay` actions.

#### Scenario: User binds Ctrl+C
- **WHEN** an action is configured with shortcut `Ctrl + C`
- **THEN** it is not registered and an error line is written to the log

### Requirement: Mod key release before actions
Before dispatching an action the class SHALL release the combo keys from the OS perspective: with `keepModKeys` only the non-mod key is toggled up; otherwise every key of the combo is toggled up in reverse order.

#### Scenario: copy-item with keepModKeys
- **WHEN** a `copy-item` action with `keepModKeys: true` fires
- **THEN** only the non-mod key (e.g. `D`) is released, modifiers stay held so the game receives Ctrl+C

### Requirement: Action dispatch by type
The handler SHALL dispatch by `action.type`: `toggle-overlay`, `paste-in-chat`, `trigger-event` (widget-action broadcast), `stash-search`, `copy-item`, and `test-only`. The removed `ocr-text` action type SHALL NOT be dispatched. Injection actions (`copy-item`, `paste-in-chat`, `stash-search`) SHALL dispatch only when input injection is available; without a helper on Wayland they SHALL be disabled with a user-visible notice.

#### Scenario: stash-search action
- **WHEN** a `stash-search` shortcut fires
- **THEN** the stash search flow runs with the configured text

#### Scenario: copy-item without injection helper on Wayland
- **WHEN** a `copy-item` shortcut fires on the Wayland backend while no injection helper is available
- **THEN** the action is not dispatched and the user sees a notice naming the missing injection helper

#### Scenario: ocr-text action no longer exists
- **WHEN** a saved config still contains a shortcut action of type `ocr-text`
- **THEN** no screenshot is taken, no event is sent, and the shortcut list simply ignores the entry

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

### Requirement: Gamepad combination dispatch
`COMBO_DOWN` SHALL invoke the same handler as the keyboard shortcut; for `copy-item` actions with `focusOverlay === false`, `COMBO_UP` SHALL assert the overlay active (pin it without toggling), because the item copy runs while the overlay is passive and a toggle would unpin an already active overlay.

#### Scenario: Price check from gamepad
- **WHEN** the user presses the combo bound to price check (`R3 + RT` by default)
- **THEN** the copy-item handler runs exactly as if the keyboard hotkey were pressed, and on combo release the overlay activates

### Requirement: B button pass-through
The gamepad B button SHALL NOT change the overlay active state: while the overlay is active the B press SHALL be forwarded to the renderer for in-window navigation, and while the overlay is inactive B SHALL have no effect in the app so the game keeps exclusive use of the button.

#### Scenario: B button
- **WHEN** the user presses the gamepad B button while the overlay is inactive
- **THEN** the overlay active state does not change and the game receives the button press

#### Scenario: B button with active overlay
- **WHEN** the user presses the gamepad B button while the overlay is active
- **THEN** the press is forwarded to the renderer as a gamepad input event and main does not change the overlay active state

### Requirement: Reserved copy-item probe
The class SHALL merge `Ctrl + C` with the game's show-mods key into a `test-only` action used to probe reserved hotkeys, and SHALL not register it permanently.

#### Scenario: Show-mods key set
- **WHEN** the game config defines `showModsKey` (e.g. Ctrl + Alt + C)
- **THEN** a merged probe shortcut is created for detection and unregistered immediately


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
