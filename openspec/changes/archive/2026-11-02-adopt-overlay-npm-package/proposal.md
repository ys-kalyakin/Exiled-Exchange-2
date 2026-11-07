# Proposal

## Why

The `extract-overlay-npm-package` blueprint is realized: the package `electron-overlay-window-next@0.1.0` is published on npm and owns the full overlay backend logic, including the fork's KDE Plasma 6 Wayland KWin bridge. The app still carries its in-app copy (`main/src/windowing/kwin/`) and backend-selection branches across ~8 consumer files, which now duplicate the package. The app must drop that redundant code and consume the published package instead of `electron-overlay-window` directly.

## What Changes

- **Dependency swap**: `main/package.json` replaces the direct `electron-overlay-window@4.1.0` dependency with the published `electron-overlay-window-next@0.1.0` (drop-in: same `OverlayController`, `OVERLAY_WINDOW_OPTS`, `AttachEvent` surface; the original remains as the package's pinned transitive dependency). The stale `allowScripts` entry (`electron-overlay-window@4.0.2`) is fixed to `4.1.0`, and `electron-overlay-window-next` is added to the esbuild externals in `main/build/script.mjs`.
- **Branch removal in windowing**: `GameWindow.ts` and `OverlayWindow.ts` lose their `isWaylandBackend()`/`getKWinBridge()` branches — the package facade routes attach/activate/focus per backend, owns the Wayland `setIgnoreMouseEvents` toggling and overlay-window binding, and its `OVERLAY_WINDOW_OPTS` is backend-aware (`resizable` on Wayland). The overlay title becomes a local constant.
- **Delete `main/src/windowing/kwin/`**: the package is the sole owner of the KWin bridge. `main.ts` keeps the explicit bridge lifecycle it has today (init with the app logger and scripts dir, `updateConfig` on host config changes, `start`, `onShortcut` → `handleExternalShortcut`, capped `stop()` on `will-quit`), imported from the package, and passes the app identity as init options (`overlayTitle`, `dbusServiceName` — values unchanged from today's constants).
- **Helper import swap in app seams**: `WidgetAreaTracker.ts`, `Shortcuts.ts`, `InputInjector.ts`, `WaylandClipboard.ts`, `HostClipboard.ts` import `isWaylandBackend`/`getKWinBridge` from the package with no logic changes (single source of truth for backend detection).
- **Deliberate behavior change** (inherited from the package's detection): backend selection now requires a KDE marker — Wayland sessions without KWin (e.g. GNOME) fall back to the X11 (XWayland) backend instead of attempting the KWin bridge. The `--overlay-backend=x11|wayland` override is preserved.
- **Supersedes** the app-migration half of the open change `extract-overlay-npm-package` (its package-repo half is complete and published as 0.1.0); that change should be archived as superseded rather than applied.

## Capabilities

### New Capabilities
- `overlay-backend-package`: the app obtains overlay windowing exclusively through the drop-in package `electron-overlay-window-next` — API parity with `electron-overlay-window`, automatic backend selection, app-specific identifiers passed as configuration, and shared detection helpers used by all app seams.

### Modified Capabilities
- `wayland-overlay-backend`: backend selection additionally requires a KDE marker (non-KDE Wayland sessions fall back to the X11 backend); the owning module of the KWin bridge implementation becomes the external package instead of `main/src/windowing/kwin/`.
- `overlay-windowing`: overlay attachment routes through the drop-in package instead of referencing `electron-overlay-window` directly.

## Impact

- **App (`main/`)**: `package.json` (deps + `allowScripts`), `build/script.mjs` (esbuild externals), `windowing/GameWindow.ts`, `windowing/OverlayWindow.ts`, `windowing/WidgetAreaTracker.ts`, `main.ts`, `shortcuts/Shortcuts.ts`, `shortcuts/InputInjector.ts`, `shortcuts/WaylandClipboard.ts`, `shortcuts/HostClipboard.ts`; delete `windowing/kwin/`. No renderer or dataParser changes.
- **Docs**: `docs/issues.md` gains a one-line note about the non-KDE Wayland fallback; `docs/cmd-flags.md` and `docs/kde-setup.md` stay valid for users (flag semantics and setup steps unchanged).
- **Upstream merges**: shared files `GameWindow.ts`/`OverlayWindow.ts` move *closer* to upstream (backend branches collapse into the package import; only the import specifier and small option lines stay fork-specific); deleting the fork-only `kwin/` files is merge-neutral; the `main.ts` diff shrinks. The `shortcuts/` seam files keep their existing fork-branch shape.
- **Gamepad feature**: unaffected — KWin hotkey forwarding stays wired (`onShortcut` → `handleExternalShortcut`), `gamepad-io` plumbing and shortcut handling untouched.
- **Linux (X11) support**: unchanged via delegation, with explicit manual verification. **Windows**: behavior unchanged via delegation; verified by type-check/build and CI only (no Windows runtime testing in this environment).
- **Out of scope**: all package-repository work (done — published 0.1.0), extracting `InputInjector` (ydotool) and `WaylandClipboard` (Klipper) into the package, GNOME/wlroots native backends and layer-shell, npm publish automation, any overlay behavior change beyond the detection fallback.
