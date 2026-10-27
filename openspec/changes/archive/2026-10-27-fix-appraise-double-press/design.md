# Design: fix-appraise-double-press

## Context

The copy-item pipeline (see proposal.md — Why) prepares the clipboard, injects `Ctrl + C` into the game, polls for item text, and forwards `MAIN->CLIENT::item-text` to the renderer. Current mechanics in `main/src/shortcuts/HostClipboard.ts` and `main/src/shortcuts/Shortcuts.ts`:

- `Shortcuts.handleHotkey` (copy-item branch) awaits `prepareForItemRead()` (reads the clipboard, publishes the `__EE2_FORCE_EMPTY_<ts>` token so Proton 10+ does not skip its copy), then injects the copy keys, then calls `readItemText()`.
- `readItemText()` **also** awaits `prepareForItemRead()` internally (upstream Kvan7/EE2 has no separate prepare method; this fork split it out for the Wayland backend, commits `95c184a3`/`2d1e5ae5`, but left the internal call in place).
- On Linux the preparation always writes a token; on other platforms it clears the clipboard when the content was already an item. The second, post-injection run can therefore overwrite item text the game just copied, and the poll then times out.
- Poll window: 500 ms everywhere except Wayland (5000 ms), while the file itself documents a >1.9 s first copy after an idle period under Proton 10 — which also runs on the X11 backend.
- `readItemText()` dedupes with `pollPromise ??=`; `prepareForItemRead()` early-returns while a poll is in flight. A rapid second press thus joins the in-flight poll (correct: the token already on the clipboard is not an item, so the game does not skip its copy) but inherits whatever timeout budget remained.
- A poll timeout throws; `Shortcuts` swallows it (`.catch(() => {})`) after the poller logged `warn [ClipboardPoller] No item text found.` — silent for the user, by design (per the existing `item-copy-pipeline` spec).

Constraints: fork tracks upstream Kvan7/Exiled-Exchange-2 — keep shared files mergeable, edits minimal and localized; gamepad copy-item shares this exact branch; platform priority Windows first, Linux (X11, KDE Wayland) second; `main` package has no unit-test runner (lint / check-types / build only).

## Goals / Non-Goals

**Goals:**
- Exactly one clipboard preparation per copy attempt, completed before the copy-key injection.
- A fast game-side copy is never clobbered by a token write that happens after the injection.
- A rapid second press joins the in-flight poll with a restarted window and succeeds.
- Keep timeout behavior silent-but-logged; keep the gamepad path and the Wayland clipboard routing working unchanged.

**Non-Goals:**
- No user-facing failure UI (toast/notification) for timeouts.
- No changes to `pressKeysToCopyItemText` mod-key toggling, `keepModKeys` rules, hold/locked hotkey focus logic, or `OverlayWindow` behavior.
- No change to the poll window constants or the per-backend split (`POLL_LIMIT` / `WAYLAND_POLL_LIMIT`): the target backend (Wayland) already polls up to 5000 ms.
- No new test harness for the `main` package; no config schema changes.

## Decisions

1. **Ownership of preparation stays in `Shortcuts`; `readItemText()` drops its internal call.**
   `HostClipboard.readItemText()` loses its `await this.prepareForItemRead()` line and gains a doc comment stating the caller must have run `prepareForItemRead()` for this attempt. `Shortcuts.handleHotkey` keeps its explicit prepare-before-inject.
   - *Why not the reverse* (rely on `readItemText`'s internal prepare, as upstream does): the whole point of the fork's split is that the token must be on the clipboard **before** the injection (Proton 10+ skip-unchanged workaround). `readItemText` runs after the injection and cannot provide that ordering — this is exactly the regression being fixed.
   - `readItemText` has exactly one call site (the copy-item branch), so the changed contract is enforced by review/typecheck, not conventions spread across the codebase.

2. **Keep the in-flight early-return in `prepareForItemRead()`, and do not rewrite the token when joining.**
   While a poll is in flight, the clipboard holds the previous token; a token is not item text, so the game's skip-unchanged check cannot suppress a copy triggered by a second press. Rewriting a fresh token during an in-flight poll would only re-open the clobber window the change removes. The early-return stays; its comment documents this rationale.

3. **Joined press restarts the poll window.**
   In `readItemText()`, when `pollPromise` exists, reset `this.elapsed = 0` before returning the existing promise, so a second press always gets a full window instead of joining an almost-expired one. This is one line and makes the "second press works" behavior deterministic.

4. **Timeout logging stays as-is (optionally enriched).**
   Keep the existing `warn [ClipboardPoller] No item text found.` line and the swallowing `.catch(() => {})` in `Shortcuts` — the spec keeps failures silent for the user. A small log enrichment (elapsed window, backend) may be added while touching the file, but no new event channel to the renderer.

## Risks / Trade-offs

- [A joined press restarts the window, so re-pressing the hotkey can keep a poll alive longer] → restore-clipboard still rewrites the previous content when the attempt ends; the pre-existing caveat that content copied manually *during* a poll can be overwritten by the restore already existed, and poll-window constants are unchanged (on Wayland the window is already 5000 ms).
- [Removing the internal prepare changes `readItemText`'s contract] → single call site always prepares first; doc comment added; `main` check-types catches future callers that forget.
- [Upstream merge friction in `HostClipboard.ts`] → the file already diverges for Wayland; the edit is a one-line deletion plus comment changes and constant unification, localized to the poller, so the next merge is a manual-but-small review.
- [Race window remains if a clipboard manager (e.g. Klipper history) rewrites the clipboard mid-poll] → pre-existing environmental factor; the fresh token on the next press recovers. Out of scope.
- [A joined press cannot re-prepare, so it relies on the token published by the first press] → the token is guaranteed present because the in-flight poll implies the first attempt completed its preparation (it awaited before injecting); if the game still does not copy, the restarted window ends in the same silent logged timeout as today.

## Migration Plan

Behavior-only fix; no config, schema, or IPC changes. Rollback is reverting the two files.

## Open Questions

None.
