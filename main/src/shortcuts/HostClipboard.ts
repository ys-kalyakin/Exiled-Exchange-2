import type { Logger } from "../RemoteLogger";
import { isWaylandBackend } from "../windowing/kwin";
import { readClipboardText, writeClipboardText } from "./WaylandClipboard";

const POLL_DELAY = 48;
const POLL_LIMIT = 500;
// the game under Proton/Wayland can take noticeably longer than on X11
// to write the item text, so the poll window is wider there; the first
// copy after an idle period is the slowest (observed >1.9s on Proton 10)
const WAYLAND_POLL_LIMIT = 5000;

// PoE must read clipboard within this timeframe,
// after that we restore clipboard.
// If game lagged for some reason, it will read
// wrong content (= restored clipboard, potentially containing password).
const RESTORE_AFTER = 120;

/** Clipboard surface handed to copy/paste helpers; writes are routed. */
export interface ClipboardWriter {
  writeText: (text: string) => Promise<void>;
}

export class HostClipboard {
  private pollPromise?: Promise<string>;
  private elapsed = 0;
  private shouldRestore = false;
  private initialDelay = POLL_DELAY;
  // the game under Proton/Wayland can take noticeably longer than on X11
  // to write the item text, so the poll window is wider there
  private pollLimit = isWaylandBackend() ? WAYLAND_POLL_LIMIT : POLL_LIMIT;
  private textBefore = "";

  private isRestored = true;

  get isPolling() {
    return this.pollPromise != null;
  }

  constructor(private logger: Logger) {}

  updateOptions(restoreClipboard: boolean) {
    this.shouldRestore = restoreClipboard;
  }

  /**
   * Reads the current clipboard and replaces it with a workaround token.
   * Resolves once the token is published, so callers can inject the copy
   * hotkey afterwards: Proton 10+ skips writing the clipboard when its
   * content hasn't changed.
   */
  async prepareForItemRead(): Promise<void> {
    if (this.pollPromise) {
      return;
    }
    this.elapsed = 0;
    let textBefore = await readClipboardText();
    const wasItem = isPoeItem(textBefore);
    if (wasItem) {
      textBefore = "";
    }
    if (process.platform !== "linux") {
      if (wasItem) {
        await writeClipboardText("");
      }
    } else {
      // workaround KDE's "Prevent empty clipboard" feature
      // see https://github.com/SnosMe/awakened-poe-trade/issues/1790#issuecomment-4062830614 (please don't comment on, add issue in EE2 if discussion is requested)
      // and the Proton 10+ bug https://github.com/SnosMe/awakened-poe-trade/issues/1846 (please don't comment on, add issue in EE2 if discussion is requested)
      await writeClipboardText(`__EE2_FORCE_EMPTY_${Date.now()}`);
    }
    this.textBefore = textBefore;
  }

  // Electron 44 made clipboard.readText async, so polling is promise-based
  /**
   * The caller must have run `prepareForItemRead()` for this attempt,
   * before injecting the copy keys — publishing the workaround token here,
   * after the injection, would clobber item text the game just copied.
   * A call while a poll is in flight joins it and never rewrites the token.
   */
  async readItemText(): Promise<string> {
    if (this.pollPromise) {
      // joined press: the token is already on the clipboard, so just
      // restart the timeout window for the second copy attempt
      this.elapsed = 0;
      return await this.pollPromise;
    }
    this.pollPromise ??= this.pollForItem();
    return await this.pollPromise;
  }

  private async pollForItem(): Promise<string> {
    try {
      for (;;) {
        await new Promise((resolve) => setTimeout(resolve, this.initialDelay));
        const textAfter = await readClipboardText();

        if (isPoeItem(textAfter)) {
          if (this.shouldRestore) {
            await writeClipboardText(this.textBefore);
          }
          return textAfter;
        }

        this.elapsed += this.initialDelay;
        if (this.elapsed >= this.pollLimit) {
          if (this.shouldRestore) {
            await writeClipboardText(this.textBefore);
          }
          this.logger.write("warn [ClipboardPoller] No item text found.");
          throw new Error("Reading clipboard timed out");
        }
      }
    } finally {
      this.pollPromise = undefined;
    }
  }

  // when `shouldRestore` is false, this function continues
  // to work as a throttler for callback
  async restoreShortly(run: (clipboard: ClipboardWriter) => Promise<void>) {
    // Not only do we not overwrite the clipboard, but we don't exec callback.
    // This throttling helps against disconnects from "Too many actions".
    if (!this.isRestored) {
      return;
    }

    this.isRestored = false;
    const saved = await readClipboardText();
    await run({ writeText: writeClipboardText });
    setTimeout(() => {
      if (this.shouldRestore) {
        void writeClipboardText(saved);
      }
      this.isRestored = true;
    }, RESTORE_AFTER);
  }

  updateDelay(delay: number) {
    this.initialDelay = delay;
  }
}

function isPoeItem(text: string) {
  return LANGUAGE_DETECTOR.find(
    ({ firstLine, uncutSkillGemLine }) =>
      text.startsWith(firstLine) || text.startsWith(uncutSkillGemLine),
  );
}

const LANGUAGE_DETECTOR = [
  {
    lang: "en",
    firstLine: "Item Class: ",
    uncutSkillGemLine: "Rarity: ",
  },
  {
    lang: "ru",
    firstLine: "Класс предмета: ",
    uncutSkillGemLine: "Редкость: ",
  },
  {
    lang: "fr",
    firstLine: "Classe d'objet: ",
    uncutSkillGemLine: "Rareté: ",
  },
  {
    lang: "de",
    firstLine: "Gegenstandsklasse: ",
    uncutSkillGemLine: "Seltenheit: ",
  },
  {
    lang: "pt",
    firstLine: "Classe do Item: ",
    uncutSkillGemLine: "Raridade: ",
  },
  {
    lang: "es",
    firstLine: "Clase de objeto: ",
    uncutSkillGemLine: "Rareza: ",
  },
  {
    lang: "th",
    firstLine: "ชนิดไอเทม: ",
    uncutSkillGemLine: "Rarity: ",
  },
  {
    lang: "ko",
    firstLine: "아이템 종류: ",
    uncutSkillGemLine: "아이템 희귀도: ",
  },
  {
    lang: "cmn-Hant",
    firstLine: "物品種類: ",
    uncutSkillGemLine: "稀有度: ",
  },
  {
    lang: "cmn-Hans",
    firstLine: "物品类别: ",
    uncutSkillGemLine: "Rarity: ",
  },
  {
    lang: "ja",
    firstLine: "アイテムクラス: ",
    uncutSkillGemLine: "レアリティ: ",
  },
];
