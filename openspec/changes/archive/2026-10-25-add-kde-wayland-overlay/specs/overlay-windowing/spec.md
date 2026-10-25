# Spec Delta

## MODIFIED Requirements

### Requirement: Linux platform support
On Linux the app SHALL select the Electron platform switches and the windowing backend by desktop session: on X11 sessions it SHALL run under X11 (`ozone-platform-hint` and `ozone-platform` set to `x11` in `main/src/main.ts`, behavior unchanged), and on Wayland sessions it SHALL run on the Wayland platform with the Wayland overlay backend. On Linux the app SHALL NOT force-enable the Electron sandbox; on other desktop platforms it SHALL enable the sandbox.

#### Scenario: Launch on Linux with X11
- **WHEN** the app starts on Linux in an X11 session
- **THEN** `ozone-platform-hint` and `ozone-platform` are set to `x11` and `app.enableSandbox()` is not called

#### Scenario: Launch on Linux with Wayland
- **WHEN** the app starts on Linux in a Wayland session
- **THEN** Electron runs on the Wayland platform and overlay attachment is driven by the Wayland backend instead of `electron-overlay-window`
