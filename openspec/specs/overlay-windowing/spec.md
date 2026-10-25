# overlay-windowing Specification

## Purpose
Renders the app as a transparent, always-on-top overlay attached to the Path of Exile 2 game window (main process, `main/src/windowing/`). Tracks the game window and controls overlay visibility, interactive (pinned) state, and hover-aware input routing so the overlay coexists with the fullscreen game.

## Requirements

### Requirement: Overlay attachment to the game window
The main process SHALL create the overlay as a transparent, frameless, always-on-top window bound to the game window bounds (via `electron-overlay-window`), and SHALL keep it aligned when the game window moves or is resized.

#### Scenario: Game window is moved
- **WHEN** the Path of Exile 2 window changes position or size
- **THEN** the overlay bounds follow the new game window bounds

#### Scenario: Game is not running
- **WHEN** no Path of Exile 2 window can be found
- **THEN** the app retries detection and does not show the overlay over unrelated windows

### Requirement: Visibility follows game focus
The overlay SHALL be visible while the game window is active and SHALL hide shortly after the game loses focus, unless the user disabled hiding on blur (`hideOverlayOnBlur`) or the overlay is pinned.

#### Scenario: Game loses focus
- **WHEN** the game window becomes inactive and `hideOverlayOnBlur` is enabled
- **THEN** the overlay becomes invisible after the configured delay (`OverlayVisibility.makeInvisible`)

#### Scenario: Game regains focus
- **WHEN** the game window becomes active again
- **THEN** the overlay is shown again at its previous widget layout

### Requirement: Pinned (active) overlay state
The overlay SHALL support an interactive pinned state toggled by the `toggle-overlay` action (`OverlayWindow.toggleActiveState`), and SHALL assert itself active when a feature requires it (`assertOverlayActive`). The `wasUsedRecently` flag SHALL report whether the user interacted with the overlay recently.

#### Scenario: Toggle overlay hotkey
- **WHEN** a `toggle-overlay` shortcut fires
- **THEN** the overlay switches between interactive (pinned, mouse-interactive) and pass-through state

### Requirement: Widget area tracking
The main process SHALL track whether the cursor is over interactive overlay areas (`WidgetAreaTracker`), SHALL remove listeners while a hotkey action executes (`removeListeners`), and the stash-scroll wheel handler SHALL ignore wheel events inside overlay areas.

#### Scenario: Mouse wheel over a widget
- **WHEN** the user scrolls with Ctrl held over an overlay widget area
- **THEN** the wheel event is not translated into arrow keys for the game stash

### Requirement: Linux platform support
On Linux the app SHALL run under X11 (ozone platform switches in `main/src/main.ts`) and SHALL NOT force-enable the Electron sandbox; on other desktop platforms it SHALL enable the sandbox.

#### Scenario: Launch on Linux with X11
- **WHEN** the app starts on Linux
- **THEN** `ozone-platform-hint` and `ozone-platform` are set to `x11` and `app.enableSandbox()` is not called
