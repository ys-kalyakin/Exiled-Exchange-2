import { ItemRarity, ParsedItem } from "@/parser/ParsedItem";
import { ItemCategory } from "@/parser";
import {
  areaLevelByAscendancyPoints,
  ascendancyPointsByAreaLevel,
  createFilters,
} from "@/web/price-check/filters/create-item-filters";
import { describe, expect, it } from "vitest";
import { createTestCreateOptions, createTestItem } from "@specs/helper";

describe("unidentified item tests", () => {
  it("should not have unid filter if identified", () => {
    const item: ParsedItem = {
      ...createTestItem(),
      isUnidentified: false,
    };

    const res = createFilters(item, createTestCreateOptions());

    expect(res.unidentified).toBeUndefined();
  });

  it("should have unid filter if unidentified", () => {
    const item: ParsedItem = {
      ...createTestItem(),
      isUnidentified: true,
    };

    const res = createFilters(item, createTestCreateOptions());

    expect(res.unidentified).toBeTruthy();
    expect(res.unidentifiedTier).toBeUndefined();
  });

  it("should have unid tier filter if unidentified is tiered", () => {
    const item: ParsedItem = {
      ...createTestItem(),
      isUnidentified: true,
      unidentifiedTier: 4,
    };

    const res = createFilters(item, createTestCreateOptions());

    expect(res.unidentified).toBeUndefined();
    expect(res.unidentifiedTier).toBeTruthy();
    expect(res.unidentifiedTier!.value).toBe(4);
  });

  it.each([
    [ItemRarity.Magic, true],
    [ItemRarity.Rare, true],
    [ItemRarity.Unique, false],
  ])("#. Should be enabled by default only on uniques", (rarity, disabled) => {
    const item: ParsedItem = {
      ...createTestItem(),
      isUnidentified: true,
      rarity,
    };

    const res = createFilters(item, createTestCreateOptions());

    expect(res.unidentified?.disabled).toBe(disabled);
  });

  it.each([
    [2, true],
    [3, true],
    [4, true],
    [5, false],
  ])("#. Should be enabled by default only on T5", (tier, disabled) => {
    const item: ParsedItem = {
      ...createTestItem(),
      isUnidentified: true,
      unidentifiedTier: tier,
    };

    const res = createFilters(item, createTestCreateOptions());

    expect(res.unidentifiedTier!.value).toBe(tier);
    expect(res.unidentifiedTier!.disabled).toBe(disabled);
  });
});

describe("Ascendancy Points calcs", () => {
  it.each([
    ["Inscribed Ultimatum", 1, 1],
    ["Inscribed Ultimatum", 23, 1],
    ["Inscribed Ultimatum", 34, 1],
    ["Inscribed Ultimatum", 42, 1],
    ["Inscribed Ultimatum", 48, 1],
    ["Inscribed Ultimatum", 55, 1],
    ["Inscribed Ultimatum", 70, 2],
    ["Inscribed Ultimatum", 78, 3],
    ["Inscribed Ultimatum", 80, 3],
    ["Inscribed Ultimatum", 100, 3],
    ["Djinn Barya", 1, 1],
    ["Djinn Barya", 23, 1],
    ["Djinn Barya", 34, 1],
    ["Djinn Barya", 42, 1],
    ["Djinn Barya", 48, 2],
    ["Djinn Barya", 55, 2],
    ["Djinn Barya", 70, 3],
    ["Djinn Barya", 78, 4],
    ["Djinn Barya", 80, 4],
    ["Djinn Barya", 100, 4],
  ])(
    "#. Should return correct points for %s area level %d",
    (refName, areaLevel, expected) => {
      const res = ascendancyPointsByAreaLevel(refName, areaLevel);

      expect(res).toBe(expected);
    },
  );

  it.each([
    ["Inscribed Ultimatum", 0, 1],
    ["Inscribed Ultimatum", 1, 1],
    ["Inscribed Ultimatum", 2, 60],
    ["Inscribed Ultimatum", 3, 75],
    ["Inscribed Ultimatum", 4, 75],
    ["Inscribed Ultimatum", 5, 75],
    ["Djinn Barya", 0, 1],
    ["Djinn Barya", 1, 1],
    ["Djinn Barya", 2, 45],
    ["Djinn Barya", 3, 60],
    ["Djinn Barya", 4, 75],
    ["Djinn Barya", 5, 75],
  ])(
    "#. Should return correct area level for %s points %d",
    (refName, points, expected) => {
      const res = areaLevelByAscendancyPoints(refName, points);

      expect(res).toBe(expected);
    },
  );
});

describe("rarity filter", () => {
  it.each([
    [ItemRarity.Normal, "normal"],
    [ItemRarity.Magic, "magic"],
    [ItemRarity.Rare, "rare"],
  ])(
    "#. Should match item rarity in match mode (%s)",
    (rarity, expectedValue) => {
      const item: ParsedItem = {
        ...createTestItem(),
        rarity,
      };

      const res = createFilters(item, createTestCreateOptions());

      expect(res.rarity).toEqual({ value: expectedValue });
    },
  );

  it.each([
    [ItemRarity.Normal],
    [ItemRarity.Magic],
    [ItemRarity.Rare],
  ])("#. Should use nonunique in legacy mode (%s)", (rarity) => {
    const item: ParsedItem = {
      ...createTestItem(),
      rarity,
    };

    const res = createFilters(item, {
      ...createTestCreateOptions(),
      rarityFilter: "nonunique",
    });

    expect(res.rarity).toEqual({ value: "nonunique" });
  });

  it.each([ItemRarity.Normal, ItemRarity.Magic, ItemRarity.Rare])(
    "#. Should omit rarity filter in off mode (%s)",
    (rarity) => {
      const item: ParsedItem = {
        ...createTestItem(),
        rarity,
      };

      const res = createFilters(item, {
        ...createTestCreateOptions(),
        rarityFilter: "off",
      });

      expect(res.rarity).toBeUndefined();
    },
  );

  it("should keep exact preset values in legacy mode", () => {
    const item: ParsedItem = {
      ...createTestItem(),
      rarity: ItemRarity.Magic,
    };

    const res = createFilters(item, {
      ...createTestCreateOptions(),
      exact: true,
      rarityFilter: "nonunique",
    });

    expect(res.rarity).toEqual({ value: "magic" });
  });

  it("should force magic on adorned jewels in off mode", () => {
    const item: ParsedItem = {
      ...createTestItem(),
      rarity: ItemRarity.Magic,
      category: ItemCategory.Jewel,
    };

    const res = createFilters(item, {
      ...createTestCreateOptions(),
      rarityFilter: "off",
    });

    expect(res.rarity).toEqual({ value: "magic", locked: true });
  });

  it("should keep nonunique for magic tablets in match mode", () => {
    const item: ParsedItem = {
      ...createTestItem(),
      rarity: ItemRarity.Magic,
      category: ItemCategory.Tablet,
    };

    const res = createFilters(item, createTestCreateOptions());

    expect(res.rarity).toEqual({ value: "nonunique" });
  });
});
