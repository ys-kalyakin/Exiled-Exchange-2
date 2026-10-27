import { describe, expect, it, vi } from "vitest";

// The global setup mocks @/web/Config; the migration tests need the real module.
vi.mock("@/web/Config", async (importOriginal) => {
  return await importOriginal<typeof import("@/web/Config")>();
});
// The real registry pulls in .vue components, which the test runner cannot compile.
vi.mock("@/web/overlay/widget-registry.js", () => ({
  registry: { widgets: [] as Array<{ widget: { type: string } }> },
}));

import { defaultConfig, upgradeConfig } from "@/web/Config";
import type { Config } from "@/web/Config";

function configWithRemovedWidgets(): Config {
  const config = defaultConfig();
  config.configVersion = 38;
  // upgradeConfig post-processing expects the price-check widget to exist
  config.widgets.push({
    wmId: 899,
    wmType: "price-check",
    wmTitle: "",
    wmWants: "hide",
    wmZorder: null,
    wmFlags: [],
    savedAugments: {},
  } as Config["widgets"][number]);
  config.widgets.push({
    wmId: 900,
    wmType: "delve-grid",
    wmTitle: "Delve",
    wmWants: "hide",
    wmZorder: null,
    wmFlags: [],
    toggleKey: null,
    gamepadHotkey: null,
  } as Config["widgets"][number]);
  config.widgets.push({
    wmId: 901,
    wmType: "image-strip",
    wmTitle: "Cheat sheets",
    wmWants: "hide",
    wmZorder: null,
    wmFlags: [],
    anchor: { pos: "tc", x: 50, y: 10 },
    images: [{ id: 1, url: "syndicate.jpg" }],
  } as Config["widgets"][number]);
  return config;
}

describe("Config migration v39 (removed PoE1-only widgets)", () => {
  it("filters delve-grid and image-strip widgets from old configs", () => {
    const config = upgradeConfig(configWithRemovedWidgets());

    expect(config.configVersion).toBe(39);
    expect(
      config.widgets.some(
        (w) => w.wmType === "delve-grid" || w.wmType === "image-strip",
      ),
    ).toBe(false);
    expect(config.widgets.some((w) => w.wmType === "price-check")).toBe(true);
  });

  it("fresh default config is at the migrated version without removed widgets", () => {
    const config = defaultConfig();

    expect(config.configVersion).toBe(39);
    expect(
      config.widgets.some(
        (w) => w.wmType === "delve-grid" || w.wmType === "image-strip",
      ),
    ).toBe(false);
  });
});
