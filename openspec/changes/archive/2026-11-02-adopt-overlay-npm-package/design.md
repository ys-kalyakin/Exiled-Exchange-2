# Design

## Context

The app still runs the pre-extraction layout: `main/src/windowing/kwin/` (`index.ts` detection, `KWinBridge.ts`, `script.ts`, `DBusService.ts`, `ScriptLoader.ts`, `LayerRule.ts`, `types.ts`) and `isWaylandBackend()`/`getKWinBridge()` branches in 8 consumer files (`GameWindow.ts`, `OverlayWindow.ts`, `WidgetAreaTracker.ts`, `main.ts`, `shortcuts/Shortcuts.ts`, `shortcuts/InputInjector.ts`, `shortcuts/WaylandClipboard.ts`, `shortcuts/HostClipboard.ts`). The direct dependency is `electron-overlay-window@4.1.0` (esbuild-external in `main/build/script.mjs`), with a stale `allowScripts` entry for `4.1.0`'s predecessor (`electron-overlay-window@4.0.2`) in `main/package.json`.

The published package `electron-overlay-window-next@0.1.0` (verified on npm) exposes: `OverlayController` facade (`targetBounds`, `targetHasFocus`, `events`, `activateOverlay()`, `focusTarget()`, `attachByTitle(window, title, options?)`, `screenshot()`), backend-aware `OVERLAY_WINDOW_OPTS`, `bindOverlayWindow(window?)`, order-safe `onShortcut`/`onCursor` seams, `detectBackend()`/`isWaylandBackend()` (sync, `--overlay-backend` flag, KDE-marker check), and `initKWinBridge(logger, scriptDir, options)`/`getKWinBridge()` with `KWinBridgeOptions {gameTitle?, shortcuts?, overlayTitle?, dbusServiceName?, windowClass?}`. Its facade (verified in `dist/facade.js`): on Wayland `attachByTitle` binds the overlay window and syncs the bridge, `activateOverlay()`/`focusTarget()` route to the bridge which owns `setIgnoreMouseEvents`, and `events` forwards the bridge's tracking events reshaped to `electron-overlay-window` payloads. Package deps: `electron-overlay-window@4.1.0` (pinned), `dbus-next`, `ini`; `electron` as peer. Constraints: upstream mergeability (minimal, localized edits in shared files), Windows first, gamepad feature keeps compiling and working.

## Goals / Non-Goals

**Goals:**
- The app depends only on the package; `main/src/windowing/kwin/` is deleted and `GameWindow`/`OverlayWindow` lose their backend branches (near-upstream shape again).
- One source of truth for backend detection across all app seams.
- Behavior parity everywhere except the deliberate non-KDE Wayland fallback.

**Non-Goals:**
- Any package-repository work (published 0.1.0; fixes land there).
- Extracting `InputInjector` (ydotool) and `WaylandClipboard` (Klipper) — they stay app-level.
- Overlay behavior changes beyond the detection fallback; renderer or dataParser changes.

## Decisions

**D1 — Pin `electron-overlay-window-next` at exact `0.1.0` from npm.** Matches the repo's existing style (`"electron-overlay-window": "4.1.0"`, no caret) and makes facade-drift updates deliberate bumps. Alternative (caret range) rejected: silent minor bumps could change backend behavior this fork depends on.

**D2 — Migration is import swaps plus branch collapse, file by file:**
- `GameWindow.ts`: import from the package; `bounds` → `OverlayController.targetBounds` (facade routes per backend); `attach()` → unconditional `OverlayController.attachByTitle(window, title, { hasTitleBarOnMac: true })` and event source `OverlayController.events` — on Wayland the facade binds the overlay window and syncs the bridge title, so the `isWaylandBackend()` skips are removed. On Wayland this adds an `attachByTitle` call that was previously skipped; the title source is the same (`cfg.windowTitle`) and `kwinBridge.updateConfig` remains the authoritative update path, so behavior is equivalent.
- `OverlayWindow.ts`: import from the package; the overlay title becomes a local constant (`"Exiled Exchange 2"`, matching `renderer/index.html`); the `resizable` branch is dropped (package `OVERLAY_WINDOW_OPTS` is backend-aware); `bindOverlayWindow(this.window)` is called unconditionally (no-op off Wayland); `assertOverlayActive`/`assertGameActive` use unbranched `OverlayController.activateOverlay()`/`focusTarget()` (facade owns `setIgnoreMouseEvents` toggling on Wayland).
- `main.ts`: `detectBackend()` imported from the package (module-scope ozone switches unchanged); explicit `initKWinBridge(logger, path.join(app.getPath("userData"), "kwin"), { gameTitle: DEFAULT_GAME_TITLE, shortcuts: [], overlayTitle: OVERLAY_WINDOW_TITLE, dbusServiceName: "io.github.kvan7.ExiledExchange2.KWin" })`; the existing lifecycle is kept verbatim — `updateConfig` on host-config changes, `start()`, `onShortcut` → `shortcuts.handleExternalShortcut`, capped `stop()` on `will-quit`.
- App seams (`WidgetAreaTracker.ts`, `Shortcuts.ts`, `InputInjector.ts`, `WaylandClipboard.ts`, `HostClipboard.ts`): switch `isWaylandBackend`/`getKWinBridge` imports to the package; no logic changes. All the bridge surface they use (`onCursor`, `removeListener("cursor", …)`, `targetBounds`, `lastCursor`) is exposed by the package's `KWinBridge`, and the bridge is explicitly initialized in `main.ts` before `Shortcuts`/`OverlayWindow` are constructed, so the singleton exists when they read it.

Why explicit init instead of the package's zero-config auto path: the app needs its own logger, the `userData` scripts dir, `updateConfig` on host-config changes, and the documented DBus name. `windowClass` is omitted — the layer rule keeps matching the overlay by title, as today.

**D3 — Delete `main/src/windowing/kwin/` wholesale**, no shim. The package's `detectBackend` adds the KDE-marker check the in-app copy lacks; nothing else in the app duplicates detection after the swaps.

**D4 — Build config.** Add `electron-overlay-window-next` to the esbuild `external` list; keep `electron-overlay-window` external (its native addon must stay in `node_modules`); `dbus-next` is already external. Fix the stale `allowScripts` entry (`electron-overlay-window@4.0.2` → `4.1.0`) while touching `package.json`.

**D5 — Docs.** One-line note in `docs/issues.md` that non-KDE Wayland sessions fall back to X11/XWayland; `docs/cmd-flags.md` and `docs/kde-setup.md` stay valid (flag semantics and setup steps unchanged).

**D6 — Supersession bookkeeping.** This change covers the app-migration half of the open `extract-overlay-npm-package` change; its package half is done. That change is archived as superseded without syncing its deltas, so the capability deltas land in master specs exactly once, via this change.

## Risks / Trade-offs

- [Facade drift if `electron-overlay-window` changes its API] → the package pins it exactly; app bumps are deliberate.
- [Wayland attach now flows through the facade (`attachByTitle` no longer skipped)] → same title source as `updateConfig`; manual KDE Wayland verification covers attach, stacking, and hotkeys.
- [Non-KDE Wayland fallback changes behavior for GNOME users] → today such sessions attempt a KWin bridge that cannot work; the fallback restores XWayland behavior; `--overlay-backend` override and a `docs/issues.md` note are the escape hatches.
- [Missing esbuild external would bundle the package and break native-addon resolution] → explicit task + `npm run dev` smoke in `main/`.
- [Windows regression from the import swap] → delegation path is a 1:1 pass-through; verified by type-check/build and CI packaging; Windows runtime smoke stays with the maintainer as today.

## Migration Plan

1. Deps + build config (`package.json`, `script.mjs`), `npm i`.
2. Import swaps and branch collapse (D2), then delete `main/src/windowing/kwin/` (D3).
3. Docs note (D5).
4. Verify: `main` lint/check-types; `renderer` lint/check-types/test; manual X11 run; manual KDE Plasma 6 Wayland run; Windows build via CI + maintainer smoke.
5. Rollback: single revert of the migration commit (restores `kwin/` and the old dependency).

## Open Questions

None — the distribution source question from the extraction change is resolved (npm, 0.1.0 published).
