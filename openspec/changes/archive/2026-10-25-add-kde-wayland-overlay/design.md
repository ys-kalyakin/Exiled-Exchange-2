# Design

## Context

The app currently supports Linux only through XWayland: `main/src/main.ts:27-31` forces `ozone-platform=x11`, and all host integration is X11-bound — `electron-overlay-window` (native xcb addon) for window tracking and overlay geometry, `uiohook-napi` (libuiohook/X11) for global hotkeys, mouse tracking and key injection, plus Electron APIs that are no-ops on Wayland (`setAlwaysOnTop`, `screen.getCursorScreenPoint`). The fork targets Windows first, Linux (X11) second, and must keep upstream merges cheap and the gamepad feature working (`gamepad-io` uses native HID/udev and is compositor-independent, so it is unaffected).

KWin (Plasma 6) exposes a scripting API that runs inside the compositor and can do everything Wayland forbids to clients: enumerate windows (`workspace.windowList`), read/write `frameGeometry`, set `keepAbove`, set `workspace.activeWindow`, observe `windowAdded`/`windowRemoved`/`windowActivated`/`frameGeometryChanged`/`cursorPosChanged`, register global shortcuts, and call out via `callDBus`. kdotool proves the operate-via-generated-script pattern (write script file → `org.kde.KWin.Scripting.loadScript` → run → unload) on Plasma 6 Wayland.

Electron click-through on Wayland requires `wl_surface.set_input_region`, reliably supported only since the Chromium fix merged in electron#51769 (Chromium ≥ 150); the app pins `electron ^40.9.1`, which lacks it. Under KWin the fixed behavior was verified working (electron#51808 reports only Mutter as still-broken).

## Goals / Non-Goals

**Goals:**
- Full overlay parity on KDE Plasma 6 Wayland: attach, bounds tracking, focus/blur, visibility, pinned/interactive and pass-through states.
- Native (compositor-level) hotkeys and cursor tracking on this backend.
- Keep the X11 path and all Windows behavior byte-for-byte unchanged.
- Restore key injection (copy-item, paste-in-chat, stash-search) through an external helper, degrading gracefully when absent.

**Non-Goals:**
- GNOME/wlroots or any compositor without KWin scripting; Plasma 5.
- Stash-scroll on Wayland (no global wheel API exists even in KWin scripting; a C++ effect plugin is the only route and is out of scope).
- Bundling ydotool or automating uinput permission setup.
- Replacing `electron-overlay-window` on Windows/macOS/X11.

## Decisions

**D1 — Compositor bridge: generated KWin script + DBus service, kdotool-style.** The main process generates a script file with embedded parameters (game window title, hotkey bindings, overlay window identity), loads it via `org.kde.KWin.Scripting.loadScript`, and unloads/reloads it on config change. The script pushes events to a DBus service owned by the main process (`dbus-next`, pure JS — no native build step, mergeable with upstream). Alternatives rejected: staying on XWayland (status quo, broken UX); a layer-shell companion process (Electron has no layer-shell support and could not host the Vue renderer); pure client-side Wayland (protocol forbids window enumeration, global coordinates, and input injection).

**D2 — Event flow replaces the tracking layer of `electron-overlay-window`.** Script → app over DBus: attach (caption match + bounds), `frameGeometryChanged` → bounds, `windowActivated`/`activeChanged` → focus/blur, `windowRemoved` → detach, `cursorPosChanged` → cursor coordinates, shortcut triggers → hotkey activations. App → script only by regenerating and reloading the script file. No polling or in-script timers (KWin scripting has no timer primitives); everything is signal-driven. Geometry sync of the overlay window (`overlay.frameGeometry = game.frameGeometry`, `overlay.keepAbove = true`) happens inside the script on game move/resize — a compositor-internal fast path that never crosses DBus.

**D3 — Overlay window lifecycle.** On Wayland, hiding a window unmaps it and KWin emits `windowRemoved`; reshowing emits `windowAdded`. The script therefore re-applies keep-above and geometry on every overlay `windowAdded`, not just once at startup. The overlay is identified by a fixed window title constant ("Exiled Exchange 2", set by `renderer/index.html`); the game is identified by the existing user-configurable `windowTitle` setting (default "Path of Exile 2").

**D4 — Fullscreen stacking via a window rule on the game.** KWin stacks fullscreen windows above keep-above windows, so the script/app installs a KWin window rule matching the game (by title/class) that forces layer "Normal", written to `kwinrulesrc` followed by `org.kde.KWin.reconfigure`; the rule is removed when the backend is disabled or the title changes. The overlay itself stays a normal mapped window and never needs to outrank the fullscreen layer.

**D5 — Input injection behind an `InputInjector` interface.** Current `uIOhook.keyTap/keyToggle` call sites (`pressKeysToCopyItemText` in `Shortcuts.ts`, `text-box.ts`) go through one injector: the existing libuiohook implementation on Windows/X11, and on Wayland an implementation that shells out to `ydotool` (talks to `ydotoold`, which owns `/dev/uinput`). Availability = binary present and daemon socket responsive; when absent, injection-dependent actions are disabled and the renderer shows a notice (new client event). `uIOhook.start()` is skipped on the Wayland backend (libuiohook cannot initialize without X11). Stash-scroll's wheel listener is registered only on non-Wayland backends and the feature is reported unavailable on Wayland.

**D6 — Platform seam kept minimal for upstream mergeability.** No rewrites of shared files: `main.ts` gains a session check around the ozone switches and `uIOhook.start()`; `OverlayWindow`/`GameWindow`/`WidgetAreaTracker` gain narrow platform-conditional seams (activate/focus-target/screenshot and cursor-source routing) instead of restructuring. The entire backend lives in a new fork-only directory `main/src/windowing/kwin/` (script generation, DBus service, backend class, injector). Backend selection: `WAYLAND_DISPLAY`/`XDG_SESSION_TYPE` at startup, plus a hidden `--overlay-backend=x11|wayland` override flag for troubleshooting.

**D7 — Electron bump to the input-region release.** Bump `electron` in `main/package.json` to the newest stable release containing PR #51769 (Chromium ≥ 150); verify click-through under KWin, then regression-check the X11 path (transparency 1000 ms workaround at `main.ts:141`, `skipTaskbar`/`resizable` opt-outs in `OVERLAY_WINDOW_OPTS`) and `gamepad-io` compatibility. Staying on Electron 40 is not an option: without input regions, pass-through cannot work on Wayland at all.

**D8 — Coordinate spaces.** KWin reports physical (device) pixels globally; Electron windows on Wayland work in DIPs. The existing Linux DIP-conversion helpers in `WidgetAreaTracker` (`scaleNumberByDisplay`) are reused; cursor and game-bounds values are converted once at the backend boundary so downstream consumers see the same coordinate space as on X11. Fractional scaling correctness is part of the verification tasks.

## Live-verified platform constraints (Plasma 6.7 / KWin 6.7.5)

- **Chromium's Wayland clipboard is focus-gated (electron#54645).** `clipboard.readText()`/`writeText()` only read foreign data and publish writes while an app window has keyboard focus — which is never true during a price check (the game is focused). Reads and writes therefore go through Klipper DBus (`org.kde.klipper.getClipboardContents`/`setClipboardContents`), falling back to `wl-paste`/`wl-copy`, with the Electron API as the last resort (`main/src/shortcuts/WaylandClipboard.ts`). Verified live: unfocused read returns clipboard content, unfocused write is published.
- **KWin assigns the fullscreen layer only to the active window.** An inactive fullscreen-flagged game sits at the normal layer, below always-visible Plasma panels (dock layer), so panels draw over the game whenever an app window is active. Panel-side demotion is impossible (keepBelow does not demote dock windows; `hidden`/`minimized`/`dock` are read-only), so the main script raises the game window itself (`keepAbove`) while any app window is visible and the game was fullscreen, and releases it when the window hides or the bridge stops. This keeps the taskbar (and any overlay icon it might still list) invisible in every overlay state, including the passive "hint" window.
- **Overlay activation deactivates the game; there is no Wayland equivalent of X11's `xcb_set_input_focus`.** With an XWayland game in exclusive fullscreen, losing activation makes wine un-fullscreen (and may minimize) the game; script-side `fullScreen = true` is rejected for XWayland windows (legacy hack). The supported mode is the game's Windowed (Borderless) Fullscreen: verified with a native-Wayland game (`PROTON_ENABLE_WAYLAND=1`), the window keeps its fullscreen flag while inactive and does not minimize.
- **`screen.getCursorScreenPoint()` returns `{0,0}` on Wayland.** The bridge forwards the compositor cursor position and the app uses it for price-check placement.
- **Hidden windows disappear from `workspace.windowList()`**, so overlay visibility is the presence of the overlay window; skipTaskbar is applied by the script on every (re)show.

## Risks / Trade-offs

- [Click-through (`setIgnoreMouseEvents`) unreliable on some KWin/software-rendering paths] → early spike task on real hardware; if broken, ship v1 with interactive-only overlay (explicit activation hotkey) and track upstream electron#51808/#52456.
- [Overlay geometry sync while the game is fullscreen or being interactively resized may lag or be rejected by KWin] → spike; the overlay is a small normal window (not fullscreen), which KWin scripting can move; verify visual sync during game resize/drag.
- [Game caption under Proton/XWayland may differ from the xcb title] → verify actual `caption` value in a live session; `windowTitle` is already user-editable, and the spike covers Steam's default.
- [DBus event flood during continuous game move/resize] → geometry sync is compositor-internal; app-bound DBus events are informational only, so moderate lag is acceptable; measure during spike.
- [Electron bump regresses X11 transparency or gamepad] → explicit verification tasks; bump is one lockfile-level revert away (rollback keeps the Wayland backend compiled but disabled on sessions where click-through fails).
- [KWin scripting API drift across Plasma 6 minor releases] → target the documented 6.0 API surface only; runtime version check with a clear error dialog on unsupported compositors.
- [Window rule edits touch user's `kwinrulesrc`] → rule entries are namespaced and removable from the app; document the file being written.

## Migration Plan

1. Land the `InputInjector` seam and backend-selection skeleton with the Wayland backend inert (no behavior change anywhere).
2. Land the KWin backend behind session detection; X11/Windows flows unchanged.
3. Bump Electron with X11/gamepad regression checks.
4. Update `docs/issues.md` (Linux section), `docs/cmd-flags.md` (override flag), and release notes; the app-update flow is Windows-only and unaffected.

Rollback: the backend is selected by session at runtime; reverting the selection flag (or the Electron bump independently) restores current behavior.

## Open Questions

- Exact Electron stable version to pin (newest with PR #51769) — resolved by the bump task, does not affect design.
- `ydotool` CLI invocation vs speaking to the `ydotoold` socket directly — implementation detail of the injector, resolved during implementation.
