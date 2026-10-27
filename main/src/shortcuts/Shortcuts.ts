import { screen, globalShortcut } from "electron";
import { uIOhook, UiohookKey, UiohookWheelEvent } from "uiohook-napi";
import { getInjector } from "./InputInjector";
import { getKWinBridge, isWaylandBackend } from "../windowing/kwin";
import {
  isModKey,
  KeyToElectron,
  mergeTwoHotkeys,
} from "../../../ipc/KeyToCode";
import { typeInChat, stashSearch } from "./text-box";
import { WidgetAreaTracker } from "../windowing/WidgetAreaTracker";
import { HostClipboard } from "./HostClipboard";
import type { ShortcutAction } from "../../../ipc/types";
import type { Logger } from "../RemoteLogger";
import type { OverlayWindow } from "../windowing/OverlayWindow";
import type { GameWindow } from "../windowing/GameWindow";
import type { GameConfig } from "../host-files/GameConfig";
import type { ServerEvents } from "../server";
import {
  Gamepad,
  gamepadConfigs,
  GamepadButton,
  GamepadEvent,
  type StickValue,
} from "gamepad-io";

type UiohookKeyT = keyof typeof UiohookKey;
const UiohookToName = Object.fromEntries(
  Object.entries(UiohookKey).map(([k, v]) => [v, k]),
);

export class Shortcuts {
  private actions: ShortcutAction[] = [];
  private stashScroll = false;
  private logKeys = false;
  private injector = getInjector();
  private areaTracker: WidgetAreaTracker;
  private clipboard: HostClipboard;
  private gamepad: Gamepad;
  // gamepad listeners are attached once (see constructor); register() only
  // (re)maps combinations, so game focus cycles never stack handlers
  private gamepadComboActions = new Map<string, ShortcutAction>();
  private gamepadComboButtons = new Set<string>();
  // fork: gamepad support — while the settings window is shown, combo
  // participants are forwarded too, so the binding UI can record them
  private gamepadCapture = false;

  static async create(
    logger: Logger,
    overlay: OverlayWindow,
    poeWindow: GameWindow,
    gameConfig: GameConfig,
    server: ServerEvents,
  ) {
    const shortcuts = new Shortcuts(
      logger,
      overlay,
      poeWindow,
      gameConfig,
      server,
    );
    return shortcuts;
  }

  private constructor(
    private logger: Logger,
    private overlay: OverlayWindow,
    private poeWindow: GameWindow,
    private gameConfig: GameConfig,
    private server: ServerEvents,
  ) {
    this.areaTracker = new WidgetAreaTracker(server, overlay);
    this.clipboard = new HostClipboard(logger);

    // surface gamepad-io connection problems (device search, HID open
    // failures): they are silent otherwise and expensive to diagnose
    this.gamepad = new Gamepad(gamepadConfigs.eightBitDoPro2, {
      log: (message) => {
        this.logger.write(`debug [Shortcuts] [gamepad-io] ${message}`);
      },
    });
    this.gamepad.on(GamepadEvent.COMBO_DOWN, (name: string) => {
      // while the settings window records combos, the raw buttons are the
      // binding input; registered combinations must not fire their actions
      if (this.gamepadCapture) return;
      const entry = this.gamepadComboActions.get(name);
      if (entry) {
        this.handleHotkey(entry, "gamepad");
      }
    });
    this.gamepad.on(GamepadEvent.COMBO_UP, (name: string) => {
      if (this.gamepadCapture) return;
      const entry = this.gamepadComboActions.get(name);
      if (
        entry?.action.type === "copy-item" &&
        entry.action.focusOverlay === false
      ) {
        // pin (not toggle): the item copy already ran while the overlay was
        // passive; toggling would unpin an already active overlay
        this.overlay.assertOverlayActive();
      }
    });
    this.gamepad.on(GamepadEvent.DOWN, (button: GamepadButton) => {
      // B is not intercepted globally: while the overlay is passive the
      // button belongs to the game; when it is active, B is forwarded to
      // the renderer for the in-window back chain
      this.forwardGamepadButton(button, "down");
    });
    this.gamepad.on(GamepadEvent.UP, (button: GamepadButton) => {
      this.forwardGamepadButton(button, "up");
    });
    // fork: gamepad support — left stick deflection for stick navigation
    this.gamepad.on(
      GamepadEvent.MOVE,
      (stickName: GamepadButton, position: StickValue) => {
        this.forwardGamepadAxis(stickName, position);
      },
    );
    this.gamepad.start();
    this.gamepadCaptureSubscription();
    this.logKeys = true;

    this.poeWindow.on("active-change", (isActive) => {
      process.nextTick(() => {
        if (isActive === this.poeWindow.isActive) {
          if (isActive) {
            this.register();
          } else {
            this.unregister();
          }
        }
      });
    });

    this.server.onEventAnyClient("CLIENT->MAIN::user-action", (e) => {
      if (e.action === "stash-search") {
        if (!this.injector.available) {
          this.logger.write(
            "error [Shortcuts] stash-search requires the input injection helper (ydotool), which is not available.",
          );
          return;
        }
        stashSearch(e.text, this.clipboard, this.overlay);
      }
    });

    uIOhook.on("keydown", (e) => {
      if (!this.logKeys) return;
      const pressed = eventToString(e);
      this.logger.write(`debug [Shortcuts] Keydown ${pressed}`);
    });
    uIOhook.on("keyup", (e) => {
      if (!this.logKeys) return;
      this.logger.write(
        `debug [Shortcuts] Keyup ${
          UiohookToName[e.keycode] || "not_supported_key"
        }`,
      );
    });

    // global wheel capture is impossible on Wayland; stash-scroll stays
    // disabled there and the renderer reports it as unavailable
    if (!isWaylandBackend()) {
      uIOhook.on("wheel", (e) => {
        if (!e.ctrlKey || !this.poeWindow.isActive || !this.stashScroll) return;

        if (!isStashArea(e, this.poeWindow)) {
          if (e.rotation > 0) {
            this.injector.keyTap(UiohookKey.ArrowRight);
          } else if (e.rotation < 0) {
            this.injector.keyTap(UiohookKey.ArrowLeft);
          }
        }
      });
    }
  }

  updateDelay(delay: number) {
    this.clipboard.updateDelay(delay);
  }

  /**
   * Wayland backend: a KWin-registered shortcut fired. The id is the hotkey
   * sequence in KWin notation ("Ctrl+D"); dispatch every matching action.
   */
  handleExternalShortcut(sequence: string) {
    // KWin shortcuts fire globally; match the X11 behavior where shortcuts
    // are unregistered while the game is inactive
    if (!this.poeWindow.isActive) {
      return;
    }
    for (const entry of this.actions) {
      const kwinSequence = entry.shortcut.split(" + ").join("+");
      if (kwinSequence === sequence) {
        this.handleHotkey(entry);
      }
    }
  }

  updateActions(
    actions: ShortcutAction[],
    stashScroll: boolean,
    logKeys: boolean,
    restoreClipboard: boolean,
  ) {
    this.stashScroll = stashScroll;
    this.logKeys = logKeys;
    this.clipboard.updateOptions(restoreClipboard);

    const copyItemShortcut = mergeTwoHotkeys(
      "Ctrl + C",
      this.gameConfig.showModsKey,
    );
    if (copyItemShortcut !== "Ctrl + C") {
      actions.push({
        shortcut: copyItemShortcut,
        action: { type: "test-only" },
      });
    }

    const allShortcuts = new Set([
      "Ctrl + C",
      "Ctrl + V",
      "Ctrl + A",
      "Ctrl + F",
      "Ctrl + Enter",
      "Home",
      "Delete",
      "Enter",
      "ArrowUp",
      "ArrowRight",
      "ArrowLeft",
      copyItemShortcut,
    ]);

    for (const action of actions) {
      if (
        allShortcuts.has(action.shortcut) &&
        action.action.type !== "test-only"
      ) {
        this.logger.write(
          `error [Shortcuts] Hotkey "${action.shortcut}" reserved by the game will not be registered.`,
        );
      }
    }
    actions = actions.filter((action) => !allShortcuts.has(action.shortcut));

    const duplicates = new Set<string>();
    for (const action of actions) {
      if (allShortcuts.has(action.shortcut)) {
        this.logger.write(
          `error [Shortcuts] It is not possible to use the same hotkey "${action.shortcut}" for multiple actions.`,
        );
        duplicates.add(action.shortcut);
      } else {
        allShortcuts.add(action.shortcut);
      }
    }
    this.actions = actions.filter(
      (action) =>
        !duplicates.has(action.shortcut) ||
        action.action.type === "toggle-overlay",
    );

    this.gamepadComboButtons = new Set(
      this.actions.flatMap((entry) =>
        entry.gamepadCombo ? entry.gamepadCombo.split(" + ") : [],
      ),
    );

    this.server.sendEventTo("broadcast", {
      name: "MAIN->CLIENT::injection-availability",
      payload: {
        kind: this.injector.kind,
        available: this.injector.available,
        stashScrollSupported: !isWaylandBackend(),
      },
    });
  }

  private register() {
    for (const entry of this.actions) {
      // register gamepad combo (idempotent: combinations persist across
      // re-registrations, only the combo -> action mapping is refreshed)
      if (entry.gamepadCombo) {
        if (!this.gamepad.getCombinations().includes(entry.gamepadCombo)) {
          const keys = entry.gamepadCombo
            .split(" + ")
            .map((key) => key as GamepadButton);
          this.gamepad.registerCombination(entry.gamepadCombo, keys);
        }
        this.gamepadComboActions.set(entry.gamepadCombo, entry);
      }

      const isOk = globalShortcut.register(
        shortcutToElectron(entry.shortcut),
        () => {
          this.handleHotkey(entry);
        },
      );

      if (!isOk) {
        this.logger.write(
          `error [Shortcuts] Failed to register a shortcut "${entry.shortcut}". It is already registered by another application.`,
        );
      }

      if (entry.action.type === "test-only") {
        globalShortcut.unregister(shortcutToElectron(entry.shortcut));
      }
    }

    // fork: gamepad support — combinations are user-configurable now, so a
    // rebind (or clear) must remove the stale registration, otherwise the
    // old combo keeps firing forever
    const currentCombos = new Set(
      this.actions.flatMap((entry) =>
        entry.gamepadCombo ? [entry.gamepadCombo] : [],
      ),
    );
    for (const name of this.gamepad.getCombinations()) {
      if (currentCombos.has(name)) continue;
      this.gamepad.unregisterCombination(name);
      this.gamepadComboActions.delete(name);
    }
  }

  private handleHotkey(
    entry: ShortcutAction,
    trigger: "keyboard" | "gamepad" = "keyboard",
  ) {
    if (this.logKeys) {
      this.logger.write(`debug [Shortcuts] Action type: ${entry.action.type}`);
    }

    // KWin shortcuts are consumed by the compositor, so on the Wayland
    // backend no keys are logically held when the action fires
    if (this.injector.kind === "libuiohook") {
      if (entry.keepModKeys) {
        const nonModKey = entry.shortcut
          .split(" + ")
          .filter((key) => !isModKey(key))[0];
        this.injector.keyToggle(UiohookKey[nonModKey as UiohookKeyT], "up");
      } else {
        entry.shortcut
          .split(" + ")
          .reverse()
          .forEach((key) => {
            this.injector.keyToggle(UiohookKey[key as UiohookKeyT], "up");
          });
      }
    }

    if (
      (entry.action.type === "copy-item" ||
        entry.action.type === "paste-in-chat" ||
        entry.action.type === "stash-search") &&
      !this.injector.available
    ) {
      this.logger.write(
        `error [Shortcuts] Action "${entry.action.type}" requires the input injection helper (ydotool), which is not available.`,
      );
      return;
    }

    if (entry.action.type === "toggle-overlay") {
      this.areaTracker.removeListeners();
      this.overlay.toggleActiveState();
    } else if (entry.action.type === "paste-in-chat") {
      typeInChat(entry.action.text, entry.action.send, this.clipboard);
    } else if (entry.action.type === "trigger-event") {
      this.server.sendEventTo("broadcast", {
        name: "MAIN->CLIENT::widget-action",
        payload: { target: entry.action.target },
      });
    } else if (entry.action.type === "stash-search") {
      stashSearch(entry.action.text, this.clipboard, this.overlay);
    } else if (entry.action.type === "copy-item") {
      const { action } = entry;
      // a pad-triggered copy means the user is reaching for the pad: the
      // overlay must become navigable regardless of recent mouse/keyboard use
      const gamepadTriggered = trigger === "gamepad";

      // screen.getCursorScreenPoint() is always {0,0} on Wayland; the KWin
      // bridge reports the real compositor cursor position
      const pressPosition =
        getKWinBridge()?.lastCursor ?? screen.getCursorScreenPoint();

      // The workaround token is published exactly once per attempt and
      // strictly before the copy keys are injected — `readItemText` does
      // not re-prepare. The game skips writing the clipboard while its
      // content is unchanged, so any post-injection write would clobber
      // the item text it just copied.
      void (async () => {
        try {
          await this.clipboard.prepareForItemRead();
        } catch {
          // a clipboard failure must not prevent the injection attempt
        }
        pressKeysToCopyItemText(
          entry.keepModKeys && this.injector.kind === "libuiohook"
            ? entry.shortcut.split(" + ").filter((key) => isModKey(key))
            : undefined,
          this.gameConfig.showModsKey,
        );
        this.clipboard
          .readItemText()
          .then((clipboard) => {
            this.areaTracker.removeListeners();
            this.server.sendEventTo("last-active", {
              name: "MAIN->CLIENT::item-text",
              payload: {
                target: action.target,
                clipboard,
                position: pressPosition,
                focusOverlay: Boolean(action.focusOverlay),
              },
            });
            if (
              action.focusOverlay &&
              (gamepadTriggered || this.overlay.wasUsedRecently)
            ) {
              this.overlay.assertOverlayActive();
            }
          })
          .catch(() => {});
      })();
    }
  }

  /**
   * Fork: gamepad support. Forwards a raw gamepad button event to the
   * renderer while the overlay is interactive. Buttons that participate in a
   * registered combination have their own shortcut semantics and are not
   * forwarded — except while capture mode is on (settings window shown), so
   * the binding UI can record them.
   */
  private forwardGamepadButton(button: GamepadButton, phase: "down" | "up") {
    if (!this.overlay.isInteractable) return;
    if (this.gamepadComboButtons.has(button) && !this.gamepadCapture) return;

    // on-rig diagnosis: shows whether presses are forwarded at all and under
    // which device button names
    this.logger.write(
      `debug [Shortcuts] gamepad ${button} ${phase}${
        this.gamepadCapture ? " (capture)" : ""
      }`,
    );

    this.server.sendEventTo("broadcast", {
      name: "MAIN->CLIENT::gamepad-input",
      payload: { button, phase },
    });
  }

  /**
   * Fork: gamepad support. Forwards left-stick deflection (values in
   * [-1, 1]) to the renderer while the overlay is interactive; the
   * dead-zone is applied renderer-side from the config.
   */
  private forwardGamepadAxis(stickName: GamepadButton, position: StickValue) {
    if (stickName !== GamepadButton.LEFT_STICK) return;
    if (!this.overlay.isInteractable) return;

    this.server.sendEventTo("broadcast", {
      name: "MAIN->CLIENT::gamepad-axis",
      payload: { x: position.x, y: position.y },
    });
  }

  /** Fork: gamepad support — capture mode follows the settings window. */
  private gamepadCaptureSubscription() {
    this.server.onEventAnyClient("OVERLAY->MAIN::gamepad-capture", (e) => {
      this.gamepadCapture = e.capture;
    });
  }

  private unregister() {
    globalShortcut.unregisterAll();
  }
}

function pressKeysToCopyItemText(
  pressedModKeys: string[] = [],
  showModsKey: string,
) {
  const injector = getInjector();
  let keys = mergeTwoHotkeys("Ctrl + C", showModsKey).split(" + ");
  keys = keys.filter((key) => key !== "C");
  if (process.platform !== "darwin") {
    // On non-Mac platforms, don't toggle keys that are already being pressed.
    //
    // For unknown reasons, we need to toggle pressed keys on Mac for advanced
    // mod descriptions to be copied. You can test this by setting the shortcut
    // to "Alt + any letter". They'll work with this line, but not if it's
    // commented out.
    keys = keys.filter((key) => !pressedModKeys.includes(key));
  }

  for (const key of keys) {
    injector.keyToggle(UiohookKey[key as UiohookKeyT], "down");
  }

  // finally press `C` to copy text
  injector.keyTap(UiohookKey.C);

  // Timeout to enforce release of keys
  // Game was dropping the release inputs for some reason
  setTimeout(() => {
    keys.reverse();
    for (const key of keys) {
      injector.keyToggle(UiohookKey[key as UiohookKeyT], "up");
    }
  }, 10);
}

function isStashArea(mouse: UiohookWheelEvent, poeWindow: GameWindow): boolean {
  if (
    !poeWindow.bounds ||
    mouse.x > poeWindow.bounds.x + poeWindow.uiSidebarWidth
  )
    return false;

  return (
    mouse.y > poeWindow.bounds.y + (poeWindow.bounds.height * 154) / 1600 &&
    mouse.y < poeWindow.bounds.y + (poeWindow.bounds.height * 1192) / 1600
  );
}

function eventToString(e: {
  keycode: number;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}) {
  const { ctrlKey, shiftKey, altKey } = e;

  let code = UiohookToName[e.keycode];
  if (!code) return "not_supported_key";

  if (code === "Shift" || code === "Alt" || code === "Ctrl") return code;

  if (ctrlKey && shiftKey && altKey) code = `Ctrl + Shift + Alt + ${code}`;
  else if (shiftKey && altKey) code = `Shift + Alt + ${code}`;
  else if (ctrlKey && shiftKey) code = `Ctrl + Shift + ${code}`;
  else if (ctrlKey && altKey) code = `Ctrl + Alt + ${code}`;
  else if (altKey) code = `Alt + ${code}`;
  else if (ctrlKey) code = `Ctrl + ${code}`;
  else if (shiftKey) code = `Shift + ${code}`;

  return code;
}

function shortcutToElectron(shortcut: string) {
  return shortcut
    .split(" + ")
    .map((k) => KeyToElectron[k as keyof typeof KeyToElectron])
    .join("+");
}
