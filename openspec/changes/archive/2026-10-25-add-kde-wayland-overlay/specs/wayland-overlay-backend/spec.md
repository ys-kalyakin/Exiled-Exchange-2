# Spec Delta

## Purpose

Provides the KDE Plasma Wayland platform backend: detects the desktop session, integrates with the KWin compositor through a generated script and a DBus bridge, and supplies game window tracking, overlay placement, stacking, activation, and cursor tracking to the app without X11 APIs.

## ADDED Requirements

### Requirement: Wayland backend selection
The app SHALL activate the Wayland overlay backend when it starts on a Wayland session, and the X11 backend otherwise. The Wayland backend SHALL own game window tracking, overlay placement, and host input integration for that session.

#### Scenario: Wayland session
- **WHEN** the app starts in a Wayland session
- **THEN** game window tracking and overlay placement are driven by the compositor integration rather than by X11 APIs

#### Scenario: X11 session
- **WHEN** the app starts in an X11 session
- **THEN** the X11 backend is used and its behavior is unchanged

### Requirement: KWin script lifecycle
The app SHALL generate a KWin script parameterized with the game window title and the configured hotkeys, load it into the running compositor, and reload it when the game window title or hotkey configuration changes.

#### Scenario: Game window title changes in settings
- **WHEN** the user changes the game window title in the app settings
- **THEN** the compositor script is reloaded with the new title and tracking follows the new window

#### Scenario: App restart
- **WHEN** the app starts on the Wayland backend
- **THEN** the compositor script is loaded for the running session without requiring a compositor restart

### Requirement: Game window tracking events
The backend SHALL deliver the same game window events the app consumes on other platforms: attach with the window bounds when a window matching the configured title exists, geometry updates when it moves or resizes, focus and blur on activation changes, and detach when it is destroyed.

#### Scenario: Game window is moved
- **WHEN** the game window changes position or size
- **THEN** the backend delivers updated bounds

#### Scenario: Game exits
- **WHEN** the game window is destroyed
- **THEN** the backend delivers a detach event and the overlay is not shown over unrelated windows

### Requirement: Overlay placement by the compositor
The backend SHALL have the compositor keep the overlay window aligned to the game window bounds and marked always-on-top, including after the overlay window is created, hidden, or reshown.

#### Scenario: Overlay appears
- **WHEN** the overlay window is created or reshown while the game window is present
- **THEN** the compositor aligns it to the game window bounds and keeps it above other windows

### Requirement: Overlay visible over fullscreen game
The overlay SHALL remain visible above the game window when the game is fullscreen. The backend SHALL ensure a compositor window rule that keeps the game window out of the fullscreen stacking layer for windows matching the configured game title.

#### Scenario: Game runs fullscreen
- **WHEN** the game window is fullscreen and the overlay should be shown
- **THEN** the overlay renders above the game window

### Requirement: Overlay activation and focus return
The backend SHALL have the compositor activate the overlay window when the app requires the overlay to be interactive, and activate the game window when the app returns focus to the game.

#### Scenario: Overlay becomes interactive
- **WHEN** the app asserts the overlay active (pinned state)
- **THEN** the compositor gives input focus to the overlay window

#### Scenario: Focus returns to the game
- **WHEN** the app requests game focus after overlay use
- **THEN** the compositor gives input focus back to the game window

### Requirement: Click-through input routing
In pass-through state the overlay SHALL NOT receive pointer input (pointer events reach the game window); in interactive state the overlay SHALL receive pointer input normally.

#### Scenario: Pass-through click
- **WHEN** the user clicks over the overlay area while it is in pass-through state
- **THEN** the click reaches the game window, not the overlay

### Requirement: Cursor position forwarding
The backend SHALL deliver host cursor position updates to the app while tracking is active, replacing X11 global mouse hooks for widget-area tracking.

#### Scenario: Cursor leaves an exclusive widget area
- **WHEN** the cursor moves farther than the close threshold from a shown exclusive widget area while the overlay is in pass-through state
- **THEN** the app hides the exclusive widget, as it does on X11

### Requirement: Game above panels while overlay is visible
While an app window is visible over the game and the game window has been fullscreen, the backend SHALL keep the game window raised above Plasma panels (KWin only assigns the fullscreen layer to the active window, so an inactive fullscreen game would otherwise sit below always-visible panels; panel properties like keepBelow, hidden and minimized are read-only for dock windows and cannot demote them). The game SHALL be restored when no app window is visible and when the backend stops.

#### Scenario: Overlay opens over a fullscreen game
- **WHEN** an app window becomes visible while the game is (or was) fullscreen
- **THEN** the game window is kept above the panels, so the taskbar does not draw over the game and no overlay icon is visible

#### Scenario: Overlay closes or backend stops
- **WHEN** the last app window is hidden or the backend stops
- **THEN** the game window's raised state is released

### Requirement: Clipboard access without focus
On the Wayland backend the app SHALL read and write the clipboard through a channel that works while the game owns keyboard focus (Klipper DBus, falling back to the wl-clipboard binaries), because Chromium's Wayland clipboard layer only serves and reads selection data while an app window is focused (electron#54645). The Electron clipboard API SHALL be the last-resort fallback.

#### Scenario: Price check while the game is focused
- **WHEN** the game copies item text to the clipboard and the app polls for it while unfocused
- **THEN** the app reads the item text through the unfocused clipboard channel and the price check opens

#### Scenario: App writes clipboard while unfocused
- **WHEN** the app writes text (workaround token, chat text, stash search) while the game is focused
- **THEN** the write is published so the game can read it back

### Requirement: Price-check placement uses the compositor cursor
The backend SHALL expose the compositor's last reported cursor position to the app, and the app SHALL use it for price-check placement, because Electron's screen cursor API returns a zero position on Wayland.

#### Scenario: Price check opens
- **WHEN** a price check opens after copy-item on the Wayland backend
- **THEN** it is placed at the compositor-reported cursor position

### Requirement: Injection helper availability
The backend SHALL detect whether an external input injection helper is available on the host and SHALL expose that availability to shortcut handling. When the helper is unavailable, injection-dependent actions SHALL be disabled and the user SHALL see a notice naming the missing helper.

#### Scenario: Injection helper present
- **WHEN** the injection helper daemon is available and the user triggers an injection-dependent action
- **THEN** the action injects the configured keys into the game

#### Scenario: Injection helper missing
- **WHEN** the injection helper is not available on the Wayland backend
- **THEN** injection-dependent actions are disabled and the notice is shown

### Requirement: No global wheel capture on Wayland
On the Wayland backend the app SHALL NOT attempt to capture global mouse wheel events, and stash-scroll SHALL be reported as unavailable to the user.

#### Scenario: Stash-scroll setting on Wayland
- **WHEN** the user enables stash-scroll on the Wayland backend
- **THEN** the app reports the feature as unavailable on Wayland and does not enable it
