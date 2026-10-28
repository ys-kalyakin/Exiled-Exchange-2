import { ItemCategory, ItemRarity } from "@/parser";
import { createPresets } from "@/web/price-check/filters/create-presets";
import { createTestCreateOptions } from "@specs/helper";
import { describe, expect, it } from "vitest";

// https://github.com/Kvan7/Exiled-Exchange-2/issues/1011
// "Fill stat values" (searchStatRange) should widen the searched roll
// of waystone map properties (Monster Rarity / Monster Effectiveness)
describe("waystone map property fill stat values", () => {
  const item = {
    info: {
      refName: "Waystone (Tier 15)",
      namespace: "ITEM" as const,
      name: "Waystone (Tier 15)",
      icon: "",
      tags: ["map_key_high"],
      craftable: { category: ItemCategory.Map },
      map: { tier: 15 },
    },
    rarity: ItemRarity.Magic,
    category: ItemCategory.Map,
    mapTier: 15,
    mapMonsterRarity: 30,
    mapEffectiveness: 25,
    statsByType: [],
    newMods: [],
    unknownModifiers: [],
    influences: [],
    isUnidentified: false,
    isCorrupted: false,
  } as never;

  function propFilter(ref: string) {
    const { presets } = createPresets(item, {
      ...createTestCreateOptions(),
      searchStatRange: 10,
    });
    const all = presets.flatMap((p) => p.stats);
    return all.find((f) => f.statRef === ref);
  }

  it("Monster Rarity gets search range", () => {
    const filter = propFilter("Monster Rarity: #%");
    expect(filter).toBeDefined();
    expect(filter!.roll!.default.min).toBeLessThan(30);
    expect(filter!.roll!.default.max).toBeGreaterThan(30);
  });

  it("Monster Effectiveness gets search range", () => {
    const filter = propFilter("Monster Effectiveness: #%");
    expect(filter).toBeDefined();
    expect(filter!.roll!.default.min).toBeLessThan(25);
    expect(filter!.roll!.default.max).toBeGreaterThan(25);
  });
});
