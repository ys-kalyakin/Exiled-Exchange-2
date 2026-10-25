import { UiohookKey as Key } from "uiohook-napi";
import process from "process";
import type { HostClipboard } from "./HostClipboard";
import type { OverlayWindow } from "../windowing/OverlayWindow";
import { getInjector } from "./InputInjector";

const PLACEHOLDER_LAST = "@last";
const AUTO_CLEAR = [
  "#", // Global
  "%", // Party
  "@", // Whisper
  "$", // Trade
  "&", // Guild
  "/", // Command
];

export function typeInChat(
  text: string,
  send: boolean,
  clipboard: HostClipboard,
) {
  clipboard.restoreShortly(async (clipboard) => {
    const injector = getInjector();
    const modifiers = process.platform === "darwin" ? [Key.Meta] : [Key.Ctrl];

    if (text.startsWith(PLACEHOLDER_LAST)) {
      text = text.slice(`${PLACEHOLDER_LAST} `.length);
      await clipboard.writeText(text);
      injector.keyTap(Key.Enter, modifiers);
    } else if (text.endsWith(PLACEHOLDER_LAST)) {
      text = text.slice(0, -PLACEHOLDER_LAST.length);
      await clipboard.writeText(text);
      injector.keyTap(Key.Enter, modifiers);
      injector.keyTap(Key.Home);
      // press twice to focus input when using controller
      injector.keyTap(Key.Home);
      injector.keyTap(Key.Delete);
    } else {
      await clipboard.writeText(text);
      injector.keyTap(Key.Enter);
      if (!AUTO_CLEAR.includes(text[0])) {
        injector.keyTap(Key.A, modifiers);
      }
    }

    injector.keyTap(Key.V, modifiers);

    if (send) {
      injector.keyTap(Key.Enter);
      // restore the last chat
      injector.keyTap(Key.Enter);
      injector.keyTap(Key.ArrowUp);
      injector.keyTap(Key.ArrowUp);
      injector.keyTap(Key.Escape);
    }
  });
}

export function stashSearch(
  text: string,
  clipboard: HostClipboard,
  overlay: OverlayWindow,
) {
  clipboard.restoreShortly(async (clipboard) => {
    const injector = getInjector();
    overlay.assertGameActive();
    await clipboard.writeText(text);
    injector.keyTap(Key.F, [Key.Ctrl]);

    injector.keyTap(Key.V, [
      process.platform === "darwin" ? Key.Meta : Key.Ctrl,
    ]);
    injector.keyTap(Key.Enter);
  });
}
