import { execFile } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import * as ini from "ini";

const KWINRULES_PATH = path.join(homedir(), ".config", "kwinrulesrc");
const RULE_DESCRIPTION = "Exiled Exchange 2 - Wayland overlay backend";
const OVERLAY_WMCLASS = "exiled-exchange-2";

type RuleConfig = Record<string, Record<string, string>>;

/**
 * KWin stacks fullscreen windows (layer 5) above keep-above windows (layer
 * 3), which would hide the overlay over a fullscreen game. This installs a
 * window rule that pins the OVERLAY window to the "popup" layer (measured
 * as layer 6, above fullscreen), leaving the game's own stacking untouched
 * so panels don't float above it. Only rules with this module's Description
 * marker are managed; other user rules are preserved.
 */
export async function installOverlayLayerRule(): Promise<void> {
  await updateRulesFile((config) => {
    const existing = findOwnRule(config);
    const uuid = existing ?? randomUUID();
    config[uuid] = {
      Description: RULE_DESCRIPTION,
      wmclass: OVERLAY_WMCLASS,
      wmclassmatch: "1",
      types: "1",
      layer: "popup",
      layerrule: "2",
    };
    setRuleList(config, (list) => (existing ? list : [...list, uuid]));
    return config;
  });
}

export async function removeOverlayLayerRule(): Promise<void> {
  await updateRulesFile((config) => {
    const existing = findOwnRule(config);
    if (!existing) return config;
    const { [existing]: _removed, ...rest } = config;
    setRuleList(rest, (list) => list.filter((id) => id !== existing));
    return rest;
  });
}

function findOwnRule(config: RuleConfig): string | undefined {
  return Object.keys(config).find(
    (section) =>
      config[section]?.Description === RULE_DESCRIPTION &&
      section !== "General",
  );
}

function setRuleList(
  config: RuleConfig,
  update: (list: string[]) => string[],
): void {
  const general = (config.General ??= {});
  const list = (general.rules ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id && id in config);
  const next = update(list);
  general.rules = next.join(",");
  general.count = String(next.length);
}

async function updateRulesFile(
  mutate: (config: RuleConfig) => RuleConfig,
): Promise<void> {
  let config: RuleConfig = {};
  try {
    if (fs.existsSync(KWINRULES_PATH)) {
      config = ini.parse(fs.readFileSync(KWINRULES_PATH, "utf8"));
    }
  } catch {
    config = {};
  }
  const before = fs.existsSync(KWINRULES_PATH)
    ? fs.readFileSync(KWINRULES_PATH, "utf8")
    : "";
  const after = ini.encode(mutate(config));
  if (after === before) return;
  fs.writeFileSync(KWINRULES_PATH, after);
  // make the running compositor pick up the new rules
  await new Promise<void>((resolve, reject) => {
    execFile(
      "busctl",
      [
        "--user",
        "call",
        "org.kde.KWin",
        "/KWin",
        "org.kde.KWin",
        "reconfigure",
      ],
      (error) => {
        if (error) {
          reject(new Error(`KWin reconfigure failed: ${error.message}`));
        } else {
          resolve();
        }
      },
    );
  });
}
