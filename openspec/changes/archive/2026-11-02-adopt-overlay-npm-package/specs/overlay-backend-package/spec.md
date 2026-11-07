# Spec Delta

## Purpose

Consumes overlay windowing in the app exclusively through the drop-in npm package `electron-overlay-window-next`, which provides the `electron-overlay-window` controller API with automatic overlay backend selection and configurable app identifiers (main process, `main/src/windowing/`).

## ADDED Requirements

### Requirement: Single overlay windowing dependency
The app SHALL obtain overlay controller functionality — attachment to the game window, activation and focus switching, game window bounds, tracking events, and overlay window options — through the drop-in package `electron-overlay-window-next`, and the app SHALL NOT depend on `electron-overlay-window` directly.

#### Scenario: API parity after the swap
- **WHEN** the app uses only the package's controller API on any platform
- **THEN** overlay attachment, activation, focus switching, and game-bounds behavior match the behavior before the adoption

#### Scenario: No direct original dependency
- **WHEN** the app's main process dependencies are inspected
- **THEN** `electron-overlay-window` appears only as a transitive dependency of the package, not as a direct app dependency

### Requirement: Automatic backend selection without app code
The package SHALL select the overlay backend automatically from the host session: the KWin compositor backend on KDE Wayland sessions and the `electron-overlay-window` implementation on Windows, macOS, and X11 sessions, without backend-selection branches in the app's windowing modules.

#### Scenario: Delegated platforms
- **WHEN** the app starts on Windows, macOS, or an X11 session
- **THEN** the package delegates game window tracking and overlay attachment to the original `electron-overlay-window` implementation with unchanged behavior

#### Scenario: KDE Wayland without branches
- **WHEN** the app starts on a supported KDE Wayland session
- **THEN** the package drives attachment, activation, focus switching, and overlay input routing through its KWin backend without any backend-selection code in the app's windowing modules

### Requirement: Backend routing owned by the package
The package controller SHALL route attachment, activation, and focus switching per backend, own the Wayland input-routing (mouse-events) toggling and overlay-window binding, and provide backend-aware overlay window options.

#### Scenario: Activation and focus through the facade
- **WHEN** the app activates the overlay or returns focus to the game through the package controller
- **THEN** input routing follows the active side on every backend without app-level backend branches

### Requirement: Configurable app identity
The package SHALL accept app-specific identifiers as initialization options: the overlay window title the compositor integration matches, the DBus service name for the bridge connection, and optionally the overlay window class used by the compositor window rule (title matching is used when the class is omitted). The app SHALL pass its own identifiers at explicit initialization and SHALL keep the bridge lifecycle (configuration updates, start, shutdown) in its own hands.

#### Scenario: App identifiers are honored
- **WHEN** the app initializes the package with its overlay title and DBus service name
- **THEN** the compositor script matching and DBus service registration use exactly those values

#### Scenario: Runtime configuration updates
- **WHEN** the user changes the game window title or shortcut configuration in app settings
- **THEN** the app updates the package bridge with the new values and tracking follows without an app restart

### Requirement: Shared session detection
The package SHALL export session detection helpers (the detected backend kind and a Wayland-backend predicate) and the app SHALL use them for all backend-kind decisions, including app-level host-input and clipboard seams, so detection has a single source of truth.

#### Scenario: Consistent detection across seams
- **WHEN** the app's shortcut, injection, cursor-tracking, or clipboard modules need the backend kind
- **THEN** they obtain it from the package's exported helpers and no app module implements its own session detection
