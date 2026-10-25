# Proposal: add-kde-wayland-overlay

## Why

On Linux the app currently runs only through XWayland: `main/src/main.ts` forces `ozone-platform=x11`, and every host integration (game window tracking, global input, overlay geometry, screenshots) is built on X11 APIs — `electron-overlay-window`'s xcb backend and `uiohook-napi`. On native Wayland sessions this X11-only mode is the main source of user-facing breakage (see `docs/issues.md` → upstream issue #673). This change adds a native KDE Plasma Wayland backend using a KWin script bridge, which the compositor exposes precisely for the operations Wayland forbids to regular clients.

## What Changes

- Add a Wayland platform backend (`main/src/windowing/kwin/`, new fork-only module):
  - a generated KWin script (kdotool-style: written to disk, loaded via `org.kde.KWin.Scripting`, reloaded on config change) plus a DBus service in the Electron main process (`dbus-next`);
  - game window tracking by caption (attach, focus/blur, geometry streaming) replacing `electron-overlay-window`'s xcb tracking;
  - overlay positioning (`frameGeometry`), always-on-top (`keepAbove`), overlay activation and focus-game (via `workspace.activeWindow`) performed by the script, since Wayland clients cannot do any of this themselves;
  - cursor tracking for `WidgetAreaTracker` via `workspace.cursorPosChanged`;
  - click-through pass-through via `setIgnoreMouseEvents` (which maps to `wl_surface.set_input_region`);
  - fullscreen stacking handled by installing a KWin window rule that pins the game window to layer "Normal" (otherwise fullscreen windows cover keep-above overlays).
- Session-based backend selection at startup (`XDG_SESSION_TYPE` / `WAYLAND_DISPLAY`): the X11 path stays as-is for X11 sessions and non-KDE environments; the Wayland backend is used on KDE Wayland sessions, with `ozone-platform` switches following the session.
- Global hotkeys on Wayland are registered through the KWin script (`registerShortcut`) and forwarded to the app over DBus, still gated on game-window focus. Replaces `uiohook-napi` listening on this backend.
- Input injection on Wayland (`keyTap`/`keyToggle`: copy-item Ctrl+C, paste-in-chat, stash-search) goes through an optional external `ydotool`/`ydotoold`; when it is not available, injection-dependent actions are disabled with a user-visible notice instead of failing silently.
- Electron is bumped to a release containing the Wayland input-region fix (PR electron#51769, Chromium ≥ 150); exact version is pinned during implementation after verifying click-through under KWin.
- Wayland v1 limitation: stash-scroll (global Ctrl+wheel → arrow keys) is unavailable — no client or KWin-scripting API exposes global wheel events; the feature stays disabled on Wayland with a notice. X11 and Windows behavior are unchanged.

## Capabilities

### New Capabilities

- `wayland-overlay-backend`: KDE Wayland platform integration — session detection and backend selection, KWin script lifecycle, the DBus bridge, game window tracking events, overlay geometry/stacking/activation performed by the compositor, cursor tracking, injection-helper availability, and the stash-scroll limitation.

### Modified Capabilities

- `overlay-windowing`: the "Linux platform support" requirement changes from unconditional X11 (ozone forced to x11) to session-based backend selection: X11 sessions keep the current ozone/x11 behavior, KDE Wayland sessions use the Wayland backend; the sandbox rule and the Linux transparency workaround stay.
- `shortcut-hotkeys`: on Wayland the shortcut transport changes (KWin-registered shortcuts forwarded over DBus instead of `uiohook-napi` listeners) and injection-dependent actions (`copy-item`, `paste-in-chat`, `stash-search`) become conditional on injection availability.

## Impact

- New dependencies: `dbus-next` (main process, pure JS); optional external tool `ydotool` + `ydotoold` (user-installed, not bundled).
- Electron version bump in `main/package.json` — diverges from the upstream-pinned `electron ^40.9.1`; the X11 path must be regression-checked after the bump.
- Code: `main/src/main.ts` (backend selection, sandbox/ozone switches), new `main/src/windowing/kwin/*`, platform seams in `main/src/windowing/{GameWindow,OverlayWindow,WidgetAreaTracker}.ts` and `main/src/shortcuts/{Shortcuts,text-box}.ts` (injection abstraction behind the existing call sites).
- Upstream mergeability: touches upstream-shared files only through small platform-conditional seams; the backend itself is a new isolated module. Fork-specific edits stay minimal and localized per project context.
- Gamepad feature: unaffected — `gamepad-io` uses native HID (udev on Linux) and does not depend on the windowing system.
- Linux (X11) support: no intended behavior change; verification tasks cover the Electron-bump regression risk.

## Out of Scope

- Wayland support on GNOME/wlroots or any compositor without KWin scripting (KDE Plasma 6 only).
- Stash-scroll on Wayland, including a KWin C++ effect plugin as a capture workaround.
- Bundling/packaging `ydotool` or automating its uinput permission setup (documented instead).
- macOS.
