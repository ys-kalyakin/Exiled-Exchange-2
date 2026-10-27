# Spec Delta

## Purpose

Defines the Linux setup documentation this fork must provide so KDE Plasma 6 Wayland users can actually enable input injection and the overlay: a VitePress setup page, README setup information, and cross-links. Documentation content is grounded in the implemented behavior of `main/src/shortcuts/InputInjector.ts` (injector availability and socket probing), `main/src/windowing/kwin/` (backend selection), and `main/src/shortcuts/Shortcuts.ts` / `WaylandClipboard.ts` (degraded actions).

## ADDED Requirements

### Requirement: KDE setup page discoverability
The documentation site SHALL include a KDE Plasma 6 Wayland setup page (owned by this capability), and the site sidebar SHALL link to it. The README SHALL link to it in its Linux section, so both GitHub and site readers can reach the setup instructions.

#### Scenario: Site reader finds the page
- **WHEN** a reader visits the documentation site and opens the sidebar
- **THEN** a KDE setup entry is present and resolves to the setup page without a 404

#### Scenario: GitHub reader finds the page
- **WHEN** a reader opens the README's "Linux support" section
- **THEN** they see setup information including a link to the full setup page on the docs site

### Requirement: ydotool installation instructions
The setup documentation SHALL describe how to install the `ydotool` package on the user's system, with explicit commands for major distro families (Arch-based, Debian/Ubuntu-based, Fedora, openSUSE) and a generic instruction for distributions not listed.

#### Scenario: User on a listed distro
- **WHEN** the user follows the installation section on an Arch, Debian/Ubuntu, Fedora, or openSUSE system
- **THEN** the documentation provides the package-manager command that installs the `ydotool` package (including the `ydotool` daemon on distros that split it)

#### Scenario: User on an unlisted distro
- **WHEN** the user's distribution is not among the listed examples
- **THEN** the documentation still tells them that the `ydotool` package must be installed via their package manager (no manual bundling)

### Requirement: ydotoold startup and uinput access instructions
The setup documentation SHALL describe how to make `ydotoold` run so that the app can use the helper: enabling the distro-provided system service (socket at `/run/ydotoold.socket`) and the alternative systemd user-unit setup (socket under `$XDG_RUNTIME_DIR`), and how to grant `ydotoold` access to `/dev/uinput` (udev rule or `input` group).

#### Scenario: System service route
- **WHEN** the user enables the distro-provided `ydotoold` systemd service
- **THEN** the documentation shows the enable command and notes the resulting socket path `/run/ydotoold.socket`

#### Scenario: User-unit route
- **WHEN** the user prefers a per-user daemon without root
- **THEN** the documentation shows a systemd user unit that starts `ydotoold` with a socket under `$XDG_RUNTIME_DIR` and how to enable it

#### Scenario: Missing uinput access
- **WHEN** `ydotoold` starts but cannot use `/dev/uinput`
- **THEN** the documentation explains the symptom and the fix (udev rule adding the user's group, or adding the user to the `input` group)

### Requirement: Helper availability detection documentation
The setup documentation SHALL accurately describe how the app on the Wayland backend decides that the injection helper is available: a `ydotool` binary on `PATH` plus a readable daemon socket from the probed candidate paths, including the `$YDOTOOL_SOCKET` override (per `main/src/shortcuts/InputInjector.ts`).

#### Scenario: Documentation matches detection order
- **WHEN** a reader checks the documented socket probe order against `main/src/shortcuts/InputInjector.ts`
- **THEN** the documented candidates — in order `$YDOTOOL_SOCKET`, `$XDG_RUNTIME_DIR/ydotool.socket`, `$XDG_RUNTIME_DIR/ydotoold.socket`, `$XDG_RUNTIME_DIR/.ydotool_socket`, `/tmp/.ydotool_socket`, `/run/ydotoold.socket` — match the implemented probe order

#### Scenario: Binary and daemon conditions are stated
- **WHEN** a reader follows the documentation to diagnose why the helper is not detected
- **THEN** the documentation states both conditions the app checks (binary on `PATH`, used socket readable) and how to verify each, and that the app re-runs detection on restart

### Requirement: Degraded actions and notice documentation
The setup documentation SHALL state that on the Wayland backend with the helper unavailable, the actions that inject input into the game (Copy Item, Paste-in-Chat, Stash Search) are disabled and the user sees a notice naming the helper.

#### Scenario: Helper not running
- **WHEN** the user sees the "input injection helper not running" notice on the Wayland backend
- **THEN** the documentation explains that the notice means `ydotoold` (or the `ydotool` binary/socket) is missing, which actions are disabled, and points them to the setup steps to fix it

#### Scenario: Helper verification
- **WHEN** the user finishes setup and wants to confirm the app accepts the helper
- **THEN** the documentation gives verification steps (socket path checks / restarting the app so detection re-runs) appropriate to the detection behavior

### Requirement: Wayland limitations and fallback documentation
The setup documentation SHALL document the KDE Plasma 6 Wayland-session limitations and recommendations: global mouse-wheel capture is unavailable so Ctrl+MouseWheel stash scroll cannot work, clipboard access while the game is focused goes through Klipper with a wl-clipboard fallback, the game should use Windowed (Borderless) Fullscreen, and `--overlay-backend=x11` forces the X11 (XWayland) backend as the fallback.

#### Scenario: Stash scroll expectation
- **WHEN** a Wayland user reads the documentation about stash scrolling
- **THEN** it states the feature is unavailable on the Wayland backend rather than prospecting a fix

#### Scenario: Game display mode
- **WHEN** a Wayland user follows the documented game-settings recommendation
- **THEN** the documentation instructs Windowed (Borderless) Fullscreen and explains the exclusive-fullscreen XWayland symptom (overlay activation un-fullscreens or minimizes the game)

#### Scenario: Backend fallback
- **WHEN** a Wayland user's setup cannot work with the compositor bridge
- **THEN** the documentation explains `--overlay-backend=x11` as the fallback override (per `main/src/windowing/kwin/` detection)

### Requirement: Cross-links from download and issues pages
The download page requirements section and the Linux section of the common-issues page SHALL link to the KDE setup page, so users hit during onboarding already know the Linux prerequisites and while troubleshooting are led to the setup instructions.

#### Scenario: Onboarding path
- **WHEN** a reader follows the download page's requirements
- **THEN** the Linux-related requirements refer to the KDE setup page for the Wayland/ydotool prerequisites

#### Scenario: Troubleshooting path
- **WHEN** a reader reaches the Linux section of the common-issues page
- **THEN** the entries about injection being disabled or Wayland behavior link to the setup page
