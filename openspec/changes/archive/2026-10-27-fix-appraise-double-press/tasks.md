# Tasks: fix-appraise-double-press

## 1. Clipboard poller (`main/src/shortcuts/HostClipboard.ts`)

- [x] 1.1 Remove the internal `await this.prepareForItemRead()` from `readItemText()` and add a doc comment stating the precondition ("the caller must have run `prepareForItemRead()` for this attempt, before injecting the copy keys"). Verify: `grep -n "prepareForItemRead" main/src/shortcuts/HostClipboard.ts` shows only the definition plus the early-return for in-flight polls, and `cd main && npm run check-types` passes.
- [x] 1.2 Restart the poll window on a joined press: in `readItemText()`, when `pollPromise` already exists, set `this.elapsed = 0` before returning the existing promise (no token rewrite on join). Verify: `cd main && npm run check-types` passes and the join path touches no clipboard write.

## 2. Copy-item call site (`main/src/shortcuts/Shortcuts.ts`)

- [x] 2.1 Confirm the copy-item branch keeps the ordering `prepareForItemRead()` → `pressKeysToCopyItemText()` → `readItemText()` and refresh the inline comment to state the exactly-once-per-attempt prepare contract; keep the silent `.catch(() => {})` timeout handling unchanged. Verify: `cd main && npm run lint && npm run check-types` pass; reading the branch shows prepare strictly before injection.

## 3. Static verification

- [x] 3.1 Renderer suite still green (shared `ipc` types untouched but guarded): `cd renderer && npm run lint && npm run check-types && npm run test` — all pass.
- [x] 3.2 Main process clean: `cd main && npm run lint && npm run check-types` — no errors.
- [x] 3.3 Spec validation: `openspec validate fix-appraise-double-press --strict` passes.

## 4. Manual behavior verification (game session)

- [ ] 4.1 Single-press appraisal on Windows and Linux/X11: hover an item, press `Ctrl + D` once → price check opens; repeat ~10 times including the first press after app launch and after an idle period — every press opens the window, and the log shows no `warn [ClipboardPoller] No item text found.` for successful presses.
- [ ] 4.2 Rapid double press: press `Ctrl + D` a second time while the first attempt is still polling → the price check shows the appraised item once, with no duplicate churn of the overlay.
- [ ] 4.3 Nothing-hovered case: press `Ctrl + D` over empty space → no popup appears, the log records the poll timeout warning, and (restore-clipboard enabled) the previous clipboard content is back afterwards.
- [ ] 4.4 KDE Plasma 6 Wayland backend (KWin bridge active): repeat checks 4.1–4.2 — the price check opens from a single press, and clipboard read/write still goes through Klipper/wl-clipboard without changes to that routing.
- [ ] 4.5 Gamepad regression: with a controller connected, the price-check combo (`R3 + RT`) and locked combo (`L3 + RT`) each appraise the hovered item from a single press, and releasing the locked combo still pins the overlay (`assertOverlayActive` behavior unchanged).

## Workflow follow-up

- After the project's review requirements are satisfied, archive the change (merges the delta into `openspec/specs/item-copy-pipeline/spec.md`).
- Verify the archived result with `openspec validate --specs --strict`.
