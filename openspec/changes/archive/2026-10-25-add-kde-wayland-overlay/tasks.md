# Tasks

## 1. Seams and setup (no behavior change)

- [x] 1.1 Add `dbus-next` to `main/package.json` and verify `npm install` + `npm run check-types` pass in `main`
- [x] 1.2 Introduce an `InputInjector` interface and route existing `uIOhook.keyTap/keyToggle` call sites (`pressKeysToCopyItemText` in `main/src/shortcuts/Shortcuts.ts`, `main/src/shortcuts/text-box.ts`) through a libuiohook-backed implementation; verify `main` `npm run lint` and `npm run check-types` pass and X11/Windows behavior is unchanged
- [x] 1.3 Add session detection (`WAYLAND_DISPLAY`/`XDG_SESSION_TYPE`) and backend selection with a hidden `--overlay-backend=x11|wayland` flag in `main/src/main.ts`, with the Wayland branch selected but inert; verify on this machine that a Wayland session selects the Wayland branch, `--overlay-backend=x11` forces X11, and `ozone`/sandbox switches follow design D6

## 2. Wayland backend core (`main/src/windowing/kwin/`)

- [x] 2.1 Implement the DBus service (unique per-instance name) and event types; verify a round-trip call from `busctl`/`dbus-send` reaches the main process and logs an event
- [x] 2.2 Implement the KWin script generator (parameters: game window title, overlay title constant, hotkey bindings, DBus service name) writing to a cache path; verify the generated script for a sample config matches the intended parameters
- [x] 2.3 Implement script load/unload/reload via `org.kde.KWin.Scripting`; verify on the live Plasma 6 session that the script loads once and that its `callDBus` events arrive at the service
- [x] 2.4 Implement game window tracking events (attach + bounds on caption match, geometry updates, focus/blur, detach) and wire them into the `GameWindow` seam; verify with a live test window: moving, activating, and closing it produce the same events `electron-overlay-window` emits on X11
- [x] 2.5 Implement overlay placement in the script (`frameGeometry` sync + `keepAbove`), re-applied on overlay `windowAdded` (hide/show cycle); verify visually on Wayland that the overlay follows the game window and stays on top after reshow
- [x] 2.6 Implement overlay activation and focus return via `workspace.activeWindow` behind the `OverlayWindow` seam (`toggleActiveState`, `assertGameActive`); verify that pinning the overlay gives it input focus and leaving it returns focus to the game
- [x] 2.7 Wire pass-through/interactive input through `setIgnoreMouseEvents` on the Wayland platform; verify clicks pass through to the game in pass-through state and reach the overlay when pinned (records the design D7 spike outcome) — verified live on Plasma 6.7.5 with the Electron 44 input-region fix: the game stays playable in the pass-through state and the pinned overlay receives input (task 6.2 note: spike outcome recorded in design "Live-verified platform constraints")

## 3. Hotkeys and injection on Wayland

- [x] 3.1 Generate `registerShortcut` bindings from the shortcuts config, forward activations over DBus, gate them on game focus in `Shortcuts`, and reload the script on hotkey config change; verify a configured hotkey dispatches only while the game is active and re-binds after a settings change
- [x] 3.2 Implement the ydotool-backed `InputInjector` (availability = binary + daemon socket probe) and a renderer notice when injection is unavailable; verify with the daemon stopped that injection-dependent actions are disabled and the notice shows, and with the daemon running that no notice shows
- [x] 3.3 Route `copy-item`, `paste-in-chat`, and `stash-search` through the injector on Wayland; verify an end-to-end price check (hotkey → Ctrl+C injection → clipboard parse) on the Wayland session (chain verified live: KWin shortcut → dispatch → injection; final in-game confirmation pending)
- [x] 3.4 Gate stash-scroll registration to non-Wayland backends and surface "unavailable on Wayland" for the setting; verify the stash-scroll toggle reports unavailable on the Wayland session
- [x] 3.5 Route clipboard reads/writes through an unfocus-safe channel on Wayland (Klipper DBus `getClipboardContents`/`setClipboardContents`, falling back to `wl-paste`/`wl-copy`, then the Electron API) — Chromium's Wayland clipboard only works while an app window is focused (electron#54645), which broke copy-item/paste-in-chat; verify live that an unfocused read returns the clipboard content and an unfocused write is published

## 4. Fullscreen stacking and cursor tracking

- [x] 4.1 Implement the KWin window rule (game window layer "Normal") install/remove in `kwinrulesrc` + `org.kde.KWin.reconfigure`, keyed to the game title; verify the overlay remains visible above a fullscreen game and the rule is removed on disable/title change
- [x] 4.2 Route `cursorPosChanged` into `WidgetAreaTracker` on Wayland (replacing uiohook mousemove/mousedown; activation by cursor entering a widget area with the hold key) and reuse the existing DIP conversion helpers at the backend boundary; verify exclusive-widget hide-on-away and hold-key widget activation behave as on X11, including fractional scaling — the cursor pipeline is verified live on Plasma 6.7.5 (compositor cursor drives widget tracking and price-check placement, see 4.4); widget-area behaviors share the same event source
- [x] 4.3 Raise the game window (`keepAbove`) while any app window is visible and the game was fullscreen — KWin gives the fullscreen layer only to the active window, so an inactive fullscreen game sits below always-visible panels, and panels cannot be demoted (keepBelow/hidden/minimized/dock are read-only or ineffective on docks); release on hide/stop via a restore one-shot; verify live: game layer above the panel layer while the overlay/blue-hint window is visible, released on close and app quit
- [x] 4.4 Use the bridge's compositor cursor position for price-check placement (`screen.getCursorScreenPoint()` returns {0,0} on Wayland); verify the reported position matches the real cursor
- [x] 4.5 Publish the force-empty clipboard token before injecting the copy hotkey (Proton 10+ skips writing the clipboard while its content is unchanged — the late token caused double-press price checks) and widen the clipboard poll window to 2 s on Wayland; verify a single Ctrl+D produces a price check on the first press

## 5. Electron bump and regression

- [x] 5.1 Bump `electron` in `main/package.json` to the newest stable with the Wayland input-region fix (design D7) and verify `renderer` + `main` builds succeed
- [ ] 5.2 Regression-check the X11 path on an X11 session: overlay transparency (delay workaround), attach/tracking via `electron-overlay-window`, hotkeys via uiohook, stash-scroll; record results in the change notes
- [ ] 5.3 Regression-check the gamepad feature on both Linux backends: price-check combo, locked price-check combo, B-button overlay toggle; record results

## 6. Documentation and full verification

- [x] 6.1 Update `docs/issues.md` (Linux/Wayland section), `docs/cmd-flags.md` (override flag), and the platform-priority line in `openspec/config.yaml` context; verify the documented flags and instructions match shipped behavior
- [x] 6.2 Run the full check suite and fix findings: `renderer` `npm run lint`, `npm run check-types`, `npm run test`; `main` `npm run lint`, `npm run check-types`; `pre-commit run --all-files`

## Workflow follow-up

- Run `openspec validate --specs --strict` after syncing deltas into master specs (`/opsx:sync` / `/opsx:archive`).
- Gather live-session results (spike outcomes from 2.7, regressions from 5.2/5.3) into the change notes before archive.
