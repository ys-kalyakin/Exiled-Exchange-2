# Gamepad Support Roadmap

Fork-specific planning document (not part of upstream). Grounded in the
`add-gamepad-navigation` change (v1, shipped) and the hardware sessions that
validated it on KDE Plasma 6 Wayland with an 8BitDo pad.

## Current state (v1)

- Global gamepad hotkeys (`gamepad-io`, combos on `ShortcutAction.gamepadCombo`).
- In-window navigation for the price check window: two-level roving focus
  (`data-gp-row` markers), dpad + A + B, auto-repeat, popover-aware back chain,
  focus layering via WidgetManager, shared intent layer (gamepad IPC + keyboard).
- Raw button forwarding from main, gated on the active overlay, combo
  participant buttons filtered out; B is never intercepted globally (the game
  owns it while the overlay is passive).
- Verified on Wayland (KWin bridge). X11 and Windows are untested.

## Principles

- The gamepad must never steal buttons from the game while the overlay is
  passive; the overlay "owns" the pad only while pinned.
- Keep fork edits to upstream files minimal; new logic lives in fork-owned
  files (`renderer/src/web/overlay/gamepad/`, `main/src/shortcuts/` gamepad
  blocks, `ipc/types.ts` additions).
- Every phase keeps the OpenSpec specs (`gamepad-navigation`,
  `shortcut-hotkeys`) in sync via `/opsx:propose` → `/opsx:apply` → `/opsx:archive`.

## Phase 1 — Device coverage and reliability (near term)

1. **Pro 3 receiver profile.** The Pro 3 receiver (USB `2dc8:3109`) is not
   matched by the `eightBitDoPro2` profile (`2dc8:6006`); the app only sees
   the pad when it is connected over Bluetooth. Build a Pro 3 profile
   (gamepad-io-helper) and support multiple candidate profiles.
2. **Multi-device and hot-plug.** `Shortcuts` holds a single `Gamepad`
   instance bound to one VID/PID. Support N devices, hot-plug (the library
   already retries), and a "gamepad connected" indicator in the settings UI.
3. **HID access guide.** Document udev/uaccess requirements for `/dev/hidraw*`
   per desktop (KDE uaccess covers joysticks; receivers may not be tagged).
4. **Platform verification.** X11 spot-check and a Windows build + manual
   regression (HID stack differs; event bus transport is platform-independent).
5. **Full button-matrix test.** v1 exercised A/B/RB/SELECT/dpad/R3/RT over
   Bluetooth; verify LT, L3, START, X, Y against the profile pin map
   (`gamepad-io-helper` live capture).

## Phase 2 — Configuration and UX polish

1. **Configurable button map.** Move the hardcoded `GAMEPAD_BUTTON_INTENTS`
   map into the config schema (renderer + ConfigStore) with a settings UI
   section; include repeat delay/interval and a navigation on/off toggle.
2. **Combo binding UI.** `gamepadCombo` is config-file-only today; add gamepad
   binding ("press the combo") to the shortcut editor in settings.
3. **Shortcut buttons.** X/Y/LB/RB: Search, toggle trade browser, preset
   switching, section jump. Contract (`MAIN->CLIENT::gamepad-input`) already
   carries raw buttons — mapping stays in the renderer.
4. **Left stick navigation** with dead-zone handling (the intent layer
   currently consumes edge-triggered buttons only).
5. **Focus memory.** Restore the last focused row when the same item type
   reopens; today navigation re-engages lazily from the top.

## Phase 3 — More windows

**Shipped in `add-gamepad-navigation-more-windows` (v2), pending hardware
regression.** The scope/layer mechanism proved window-agnostic: populating a
window is scope registration (`useGamepadWidgetScope`) + optional
`data-gp` markers; windows without markers get DOM-derived rows
(`synthesizeRows` — recursive partition, one row per layout block, bare
controls become singleton rows) and the focused control scrolls into view.
Gamepad navigation no longer fires while a combo capture is armed.

1. ~~**Widget menu**~~ shipped (chips row + A toggles widgets; B falls through
   to unpin — the menu has no close control).
2. ~~**Map check**~~ shipped (stat rows cycle the decision with A; B hides).
3. ~~**Item check, stash search, notepad, library, stopwatch**~~ registered
   (library is inert until the alpha is enabled; image strip included too).
4. ~~**Item editor**~~ numeric inputs step with left/right like any control;
   no text entry yet.
5. ~~**Settings window**~~ shipped via DOM-derived rows (no per-page markers
   needed); B cancels, focus memory restores the last row per window.

Follow-ups found during v2 verification: arming a combo capture with the
gamepad A button records "A" immediately (arm with the mouse, or accept the
first press as part of the combo); menu popover content is tippy-teleported
and therefore not row-navigable (B still closes it).

## Phase 4 — Advanced input

1. **Trade results navigation** (listing cards, open-on-site buttons); the
   trade webview stays excluded until then.
2. **On-screen keyboard** for text inputs (search fields, numeric entry
   without a physical keyboard) — the largest standalone feature.
3. **Rumble/haptic feedback** on overlay activation (HID output reports).
4. **Virtual cursor** mode as a fallback for unmarked UI (explicitly
   rejected for v1; keep as a last-resort escape hatch).

## Engineering notes / known footguns

- `server.ts` routes `last-active` events (`item-text`!) to the newest WS
  connection — debug listeners steal them from the overlay. Consider routing
  `item-text` to the overlay client explicitly, or dropping `last-active`.
- Proton/Wayland writes the first clipboard copy after idle late (>1.9 s);
  the poll window is 5 s now (HostClipboard). Watch for further timeouts.
- Upstream filter components carry `data-gp-row` attributes and a
  `detail === 0` activation guard (`FilterModifier.toggleFilter`) — re-check
  both after upstream merges.
- `openspec/config.yaml` forbids breaking the gamepad feature; each phase
  above updates `gamepad-navigation` / `shortcut-hotkeys` specs accordingly.
