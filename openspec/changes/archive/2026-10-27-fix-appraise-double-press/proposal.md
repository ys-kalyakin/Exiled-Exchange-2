# Proposal: fix-appraise-double-press

## Why

Users sometimes have to press the price-check hotkey (`Ctrl + D`, item appraisal) twice before the window opens: the first press silently does nothing. The copy-item pipeline writes the clipboard workaround token twice per press — `Shortcuts` awaits `prepareForItemRead()` before injecting the copy keys, and `HostClipboard.readItemText()` runs the preparation again internally. If the game copies the item quickly, the second token write clobbers the freshly copied item text, the poll never sees an item and times out, and the failure is swallowed.

## What Changes

- Run the clipboard preparation (read current content, publish the force-empty workaround token) exactly **once** per copy attempt, before the copy-key injection; `HostClipboard.readItemText()` no longer re-runs the preparation.
- A press while an earlier poll is still in flight joins that poll and restarts its timeout window instead of silently inheriting an almost-expired one; joining never rewrites the workaround token, so the clobber window is not re-opened.
- Keep failure handling as today: timeouts are logged as a warning and swallowed without crashing; no user-facing failure popup is added.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `item-copy-pipeline`: the "Clipboard polling" requirement changes to per-attempt semantics — one preparation per attempt before injection, and a rapid second press joins the in-flight poll with a restarted window. The "In-game copy trigger" requirement gains the ordering constraint that the workaround token must be published before the copy keys are injected.

## Impact

- `main/src/shortcuts/HostClipboard.ts` and the `copy-item` branch of `main/src/shortcuts/Shortcuts.ts` — both shared with upstream Kvan7/Exiled-Exchange-2. This fork's copy already diverges there (Wayland clipboard routing, the split-out `prepareForItemRead`); edits stay minimal and localized so the next upstream merge stays manageable.
- Gamepad feature: the copy-item path is shared by keyboard and gamepad triggers, so the gamepad combos inherit the fix; the `COMBO_UP` pin logic (`assertOverlayActive`) is untouched and keeps working.
- Linux support: the fix targets the X11 and KDE Plasma 6 Wayland backends where the race and the short poll window bite most; Windows also benefits from removing the clobber window. Wayland clipboard routing (Klipper / wl-clipboard) itself is not changed.
- Out of scope: user-visible failure UI, changes to `pressKeysToCopyItemText` mod-key injection logic, hold/locked hotkey focus behavior, and any refactor beyond the clipboard poller and its single call site.
