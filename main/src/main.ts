"use strict";

import { app, systemPreferences } from "electron";
import { uIOhook } from "uiohook-napi";
import os from "node:os";
import path from "node:path";
import { startServer, eventPipe, server } from "./server";
import { Logger } from "./RemoteLogger";
import { GameWindow } from "./windowing/GameWindow";
import { OverlayWindow } from "./windowing/OverlayWindow";
import { GameConfig } from "./host-files/GameConfig";
import { Shortcuts } from "./shortcuts/Shortcuts";
import { AppUpdater } from "./AppUpdater";
import { AppTray } from "./AppTray";
import { OverlayVisibility } from "./windowing/OverlayVisibility";
import { GameLogWatcher } from "./host-files/GameLogWatcher";
import { HttpProxy } from "./proxy";
import { installExtension, VUEJS_DEVTOOLS } from "electron-devtools-installer";
import { FileWriter } from "./host-files/FileWriter";
import { detectBackend, initKWinBridge } from "./windowing/kwin";

const DEFAULT_GAME_TITLE = "Path of Exile 2";

/**
 * KWin registerShortcut bindings are keyed by the hotkey sequence itself;
 * the app resolves the sequence back to its actions on each activation.
 */
function shortcutsToBindings(
  shortcuts: Array<{ shortcut: string; action: { type: string } }>,
): Array<[string, string]> {
  const bindings = new Map<string, string>();
  for (const entry of shortcuts) {
    if (entry.action.type === "test-only") continue;
    const sequence = entry.shortcut.split(" + ").join("+");
    if (!bindings.has(sequence)) {
      bindings.set(sequence, sequence);
    }
  }
  return [...bindings.entries()];
}

if (!app.requestSingleInstanceLock()) {
  app.exit();
}

if (process.platform !== "darwin") {
  app.disableHardwareAcceleration();
}
const overlayBackend = process.platform === "linux" ? detectBackend() : "x11";
if (process.platform !== "linux") {
  app.enableSandbox();
} else if (overlayBackend === "wayland") {
  app.commandLine.appendSwitch("ozone-platform-hint", "wayland");
  app.commandLine.appendSwitch("ozone-platform", "wayland");
} else {
  app.commandLine.appendSwitch("ozone-platform-hint", "x11");
  app.commandLine.appendSwitch("ozone-platform", "x11");
}
let tray: AppTray;

(async () => {
  if (process.platform === "darwin") {
    async function ensureAccessibilityPermission(): Promise<boolean> {
      if (systemPreferences.isTrustedAccessibilityClient(false)) return true;

      // Trigger the system prompt
      systemPreferences.isTrustedAccessibilityClient(true);

      const maxWaitTime = 15000; // 15 seconds
      const startTime = Date.now();

      return await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (systemPreferences.isTrustedAccessibilityClient(false)) {
            clearInterval(interval);
            resolve(true);
          }

          // Stop waiting if time runs out
          if (Date.now() - startTime > maxWaitTime) {
            clearInterval(interval);
            resolve(false);
          }
        }, 1000);
      });
    }
    const hasPermission = await ensureAccessibilityPermission();
    if (!hasPermission) {
      console.warn("Accessibility permission not granted, exiting");
      app.quit();
      return;
    }
    console.log("Accessibility permission granted, starting app");
  }

  app.on("ready", async () => {
    tray = new AppTray(eventPipe);
    const logger = new Logger(eventPipe);
    const gameConfig = new GameConfig(eventPipe, logger);
    const poeWindow = new GameWindow();
    const appUpdater = new AppUpdater(eventPipe);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _httpProxy = new HttpProxy(server, logger);
    const fileWriter = new FileWriter(eventPipe, logger);
    const gameLogWatcher = new GameLogWatcher(eventPipe, logger, fileWriter);

    if (process.env.VITE_DEV_SERVER_URL) {
      try {
        await installExtension(VUEJS_DEVTOOLS);
        logger.write("info Vue Devtools installed");
      } catch (error) {
        logger.write(`error installing Vue Devtools: ${error}`);
        console.log(`error installing Vue Devtools: ${error}`);
      }
    }
    process.addListener("uncaughtException", (err) => {
      logger.write(`error [uncaughtException] ${err.message}, ${err.stack}`);
    });
    process.addListener("unhandledRejection", (reason) => {
      logger.write(`error [unhandledRejection] ${(reason as Error).stack}`);
    });

    setTimeout(
      async () => {
        const kwinBridge =
          overlayBackend === "wayland"
            ? initKWinBridge(
                logger,
                path.join(app.getPath("userData"), "kwin"),
                { gameTitle: DEFAULT_GAME_TITLE, shortcuts: [] },
              )
            : undefined;
        const overlay = new OverlayWindow(eventPipe, logger, poeWindow);
        // eslint-disable-next-line no-new
        new OverlayVisibility(eventPipe, overlay, gameConfig);
        const shortcuts = await Shortcuts.create(
          logger,
          overlay,
          poeWindow,
          gameConfig,
          eventPipe,
        );
        eventPipe.onEventAnyClient(
          "CLIENT->MAIN::update-host-config",
          (cfg) => {
            overlay.updateOpts(
              cfg.overlayKey,
              cfg.windowTitle,
              cfg.hideOverlayOnBlur,
            );
            shortcuts.updateActions(
              cfg.shortcuts,
              cfg.stashScroll,
              cfg.logKeys,
              cfg.restoreClipboard,
            );
            shortcuts.updateDelay(cfg.initialDelay);
            gameLogWatcher.restart(cfg.clientLog ?? "", cfg.readClientLog);
            gameConfig.readConfig(cfg.gameConfig ?? "");
            appUpdater.checkAtStartup();
            tray.overlayKey = cfg.overlayKey;
            fileWriter.restart(cfg.libraryAlpha, cfg.libraryOutputPath);
            kwinBridge?.updateConfig({
              gameTitle: cfg.windowTitle,
              shortcuts: shortcutsToBindings(cfg.shortcuts),
            });
          },
        );

        if (kwinBridge) {
          await kwinBridge.start();
          kwinBridge.onShortcut((id) => {
            shortcuts.handleExternalShortcut(id);
          });
          let kwinCleanupDone = false;
          app.on("will-quit", (event) => {
            if (kwinCleanupDone) return;
            // hold the quit until the bridge releases compositor state
            // (scripts unloaded, layer rule removed); capped so a stuck
            // DBus call cannot prevent quitting
            event.preventDefault();
            kwinCleanupDone = true;
            void Promise.race([
              kwinBridge.stop(),
              new Promise((resolve) => setTimeout(resolve, 3000)),
            ]).then(() => {
              app.exit();
            });
          });
          console.log("Wayland overlay backend started");
        } else {
          uIOhook.start();
          console.log("uIOhook started");
        }
        const port = await startServer(appUpdater, logger);
        // TODO: move up (currently crashes)
        logger.write(`info ${os.type()} ${os.release} / v${app.getVersion()}`);
        overlay.loadAppPage(port);
        tray.serverPort = port;
      },
      // fixes(linux): window is black instead of transparent
      process.platform === "linux" ? 1000 : 0,
    );
  });
})();
