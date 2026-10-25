import type { BrowserWindow } from "electron";
import { EventEmitter } from "events";
import { OverlayController, AttachEvent } from "electron-overlay-window";
import { getKWinBridge, isWaylandBackend } from "./kwin";

export interface GameWindow {
  on: (event: "active-change", listener: (isActive: boolean) => void) => this;
}
export class GameWindow extends EventEmitter {
  private _isActive = false;
  private _isTracking = false;

  get bounds() {
    if (isWaylandBackend()) {
      return getKWinBridge()?.targetBounds ?? OverlayController.targetBounds;
    }
    return OverlayController.targetBounds;
  }

  get isActive() {
    return this._isActive;
  }

  set isActive(active: boolean) {
    if (this.isActive !== active) {
      this._isActive = active;
      this.emit("active-change", this._isActive);
    }
  }

  get uiSidebarWidth() {
    // sidebar is 370px at 800x600
    const ratio = 370 / 600;
    return Math.round(this.bounds.height * ratio);
  }

  attach(window: BrowserWindow | undefined, title: string) {
    if (!this._isTracking) {
      const events = isWaylandBackend()
        ? getKWinBridge()
        : OverlayController.events;
      if (events) {
        events.on("focus", () => {
          this.isActive = true;
        });
        events.on("blur", () => {
          this.isActive = false;
        });
      }
      if (!isWaylandBackend()) {
        OverlayController.attachByTitle(window, title, {
          hasTitleBarOnMac: true,
        });
      }
      this._isTracking = true;
    }
  }

  onAttach(cb: (hasAccess: boolean | undefined) => void) {
    const events = isWaylandBackend()
      ? getKWinBridge()
      : OverlayController.events;
    events?.on("attach", (e: AttachEvent) => {
      cb(e.hasAccess);
    });
  }

  screenshot() {
    return OverlayController.screenshot();
  }
}
