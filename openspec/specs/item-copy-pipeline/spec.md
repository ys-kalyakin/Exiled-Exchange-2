# item-copy-pipeline Specification

## Purpose
The chain from a copy-item hotkey press (keyboard or gamepad) to the parsed item appearing in the renderer: key release, in-game copy (`Ctrl + C`), clipboard reading with retries (`HostClipboard`), and the `MAIN->CLIENT::item-text` event.

## Requirements

### Requirement: In-game copy trigger
On a `copy-item` action the main process SHALL release the combo keys per `keepModKeys` rules and press the copy keys (`pressKeysToCopyItemText`) — `Ctrl + C` merged with the game's show-mods key, omitting already-held modifiers on non-macOS platforms.

#### Scenario: Hotkey with keepModKeys
- **WHEN** the user presses `Ctrl + D` bound to price check while holding Ctrl
- **THEN** only `D` is released and `Ctrl + C` is tapped so the game copies the hovered item

### Requirement: Clipboard polling
`HostClipboard` SHALL read the clipboard repeatedly until a full item text appears, using the configured initial delay (`updateDelay`), and SHALL restore the previous clipboard contents afterwards when restore-clipboard is enabled (`updateOptions`).

#### Scenario: Game copies item with a delay
- **WHEN** the game writes the item text to the clipboard after the initial read attempts
- **THEN** a later poll returns the item text and the pipeline continues

#### Scenario: Restore clipboard enabled
- **WHEN** the user had other content on the clipboard and restore-clipboard is enabled
- **THEN** after the item text is read, the previous clipboard content is restored

### Requirement: item-text event to the renderer
When item text is obtained, the main process SHALL send `MAIN->CLIENT::item-text` to the last-active renderer client with the item text, cursor screen position, widget `target`, and `focusOverlay`; failures to read the clipboard SHALL be swallowed without crashing.

#### Scenario: Price check copy completes
- **WHEN** the clipboard contains item text for the `price-check` target
- **THEN** the renderer receives `item-text` with the text and the cursor position at press time

### Requirement: Overlay focus on copy
If the action requests overlay focus and the overlay was used recently, the main process SHALL force the overlay active (`assertOverlayActive`); gamepad copy-item actions with `focusOverlay === false` SHALL activate the overlay when the combo is released.

#### Scenario: Locked price check from gamepad
- **WHEN** the gamepad combo for the locked price check is released
- **THEN** the overlay becomes active so results stay visible while the user keeps playing
