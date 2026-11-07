# Tasks

All tasks are in **this repository**; the package repository work is complete (published as `electron-overlay-window-next@0.1.0`).

## 1. Dependency and build config

- [x] 1.1 `main/package.json`: add `electron-overlay-window-next` pinned at `0.1.0`, remove the direct `electron-overlay-window` dependency, fix the stale `allowScripts` entry (`electron-overlay-window@4.0.2` → `4.1.0`); run `npm i` in `main/` and verify the package resolves (`node -e "console.log(require.resolve('electron-overlay-window-next/package.json'))"` from `main/`)
- [x] 1.2 `main/build/script.mjs`: add `electron-overlay-window-next` to the esbuild `external` list (keep `electron-overlay-window` and `dbus-next` external); verify `npm run dev` starts in `main/` without module-not-found errors

## 2. Windowing migration (design D2)

- [x] 2.1 `windowing/GameWindow.ts`: swap imports to the package; make `bounds`, `attach()`, and `onAttach()` unbranched (`OverlayController.targetBounds` / `OverlayController.events` / unconditional `attachByTitle(window, title, { hasTitleBarOnMac: true })`); verify `npm run check-types` in `main/`
- [x] 2.2 `windowing/OverlayWindow.ts`: swap imports to the package; move `OVERLAY_WINDOW_TITLE` to a local constant matching `renderer/index.html`; drop the `resizable` branch (package `OVERLAY_WINDOW_OPTS` is backend-aware); call `bindOverlayWindow(this.window)` unconditionally; use unbranched `OverlayController.activateOverlay()`/`focusTarget()`; verify `npm run check-types` in `main/`
- [x] 2.3 `main.ts`: import `detectBackend` and `initKWinBridge` from the package (module-scope ozone switches unchanged); extend the explicit init options with `overlayTitle` and `dbusServiceName` (`io.github.kvan7.ExiledExchange2.KWin`); keep the bridge lifecycle verbatim (`updateConfig` on host-config changes, `start`, `onShortcut` → `handleExternalShortcut`, capped `stop` on `will-quit`); verify `npm run check-types` in `main/`

## 3. App seams and cleanup

- [x] 3.1 `windowing/WidgetAreaTracker.ts`, `shortcuts/Shortcuts.ts`, `shortcuts/InputInjector.ts`, `shortcuts/WaylandClipboard.ts`, `shortcuts/HostClipboard.ts`: switch `isWaylandBackend`/`getKWinBridge` imports to the package with no logic changes; verify `npm run check-types` in `main/`
- [x] 3.2 Delete `main/src/windowing/kwin/`; verify `grep -rn "windowing/kwin" main/src` is empty and no app module implements its own session detection; verify `npm run check-types` in `main/`
- [x] 3.3 `docs/issues.md`: add a one-line note that non-KDE Wayland sessions fall back to the X11 (XWayland) backend; confirm `docs/cmd-flags.md` and `docs/kde-setup.md` need no edits

## 4. Verification

- [x] 4.1 `main/`: `npm run lint` and `npm run check-types` both pass
- [x] 4.2 `renderer/`: `npm run lint`, `npm run check-types`, and `npm run test` all pass (gamepad feature compiles and tests untouched)
- [ ] 4.3 Manual X11 run: overlay attaches to the game, visibility follows focus, pinned state and price check work; verify the `overlay-windowing` scenarios
- [x] 4.4 Manual KDE Plasma 6 Wayland run: attach, fullscreen stacking, KWin hotkeys, Klipper clipboard, price-check cursor placement, ydotool notice; verify the `wayland-overlay-backend` scenarios (user-verified live on KDE Plasma 6 Wayland, 2026-11-07: everything works; bridge teardown on quit also verified — KWin script unloaded, DBus service gone)
- [ ] 4.5 Verify `--overlay-backend=x11` forces the X11 backend on a Wayland session, a Wayland session without KDE markers picks X11, and the Windows CI build/package is green; maintainer performs the Windows runtime smoke as today

## Workflow follow-up

- Archive the superseded change `extract-overlay-npm-package` (its package half is published as 0.1.0; its app half is this change) without syncing its delta specs.
- On `/opsx:sync`, update the `wayland-overlay-backend` Purpose to reference `electron-overlay-window-next` as the owning module of the KWin bridge implementation, replacing the `main/src/windowing/kwin/` reference.
- Archive this change after the project's review requirements are satisfied; verify the archived result.
