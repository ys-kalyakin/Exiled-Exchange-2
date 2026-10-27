import { beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { init } from "@/assets/data";
import {
  __testExports,
  createTradeRequest,
  DisplayItemLine,
} from "@/web/price-check/trade/pathofexile-trade";
import { createFilters } from "@/web/price-check/filters/create-item-filters";
import { createTestCreateOptions, createTestItem } from "@specs/helper";
import { ItemRarity, ParsedItem } from "@/parser/ParsedItem";
import { setupTests } from "@specs/vitest.setup";

function getFetchResult(idPrefix: string) {
  const filePath = path.resolve(__dirname, "../../../docs/fetchResponses.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return data.result.find((result: { id: string }) =>
    result.id.startsWith(idPrefix),
  );
}
function getTiers(lines: DisplayItemLine[] | undefined) {
  return lines?.map((line) => line.tier);
}

describe("pathofexile-trade tooltip parsing", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  it("preserves affix tiers for listing tooltip modifiers", () => {
    const displayItem = __testExports.parseFetchResult(
      getFetchResult("65c7c4e8"),
    );
    const tiers = getTiers(displayItem!.explicitMods);

    expect(tiers).toEqual(["P2", "S3"]);
  });

  it("reuses the same affix tier for hybrid modifier lines", () => {
    const displayItem = __testExports.parseFetchResult(
      getFetchResult("ece06af2"),
    );
    const tiers = getTiers(displayItem!.explicitMods);

    expect(tiers).toEqual(["P7", "P7", "P5", "S5", "S6"]);
  });

  it("can do many tiers to one mod", () => {
    const displayItem = __testExports.parseFetchResult(
      getFetchResult("2fa2f1ee"),
    );
    const tiers = getTiers(displayItem!.explicitMods);

    expect(tiers).toEqual(["P2 + P5", "P6", "P5", "S4", "S4", "S4"]);
  });

  it("can do many mods from one tier", () => {
    const displayItem = __testExports.parseFetchResult(
      getFetchResult("91c9f13"),
    );
    const tiers = getTiers(displayItem!.explicitMods);

    expect(tiers).toEqual(["P19", "S1", "S1", "S1"]);
  });
});

describe("trade request rarity option", () => {
  beforeEach(async () => {
    setupTests();
    await init("en");
  });

  function buildBody(
    rarity: ItemRarity,
    rarityFilter: "match" | "nonunique" | "off",
    toggledOff = false,
  ) {
    const item: ParsedItem = { ...createTestItem(), rarity };
    const filters = createFilters(item, {
      ...createTestCreateOptions(),
      rarityFilter,
    });
    if (toggledOff && filters.rarity) {
      filters.rarity.disabled = true;
    }
    return createTradeRequest(filters, [], item);
  }

  it("restricts a magic item to magic listings in match mode", () => {
    const body = buildBody(ItemRarity.Magic, "match");

    expect(body.query.filters.type_filters?.filters.rarity?.option).toBe(
      "magic",
    );
  });

  it("restricts a rare item to rare listings in match mode", () => {
    const body = buildBody(ItemRarity.Rare, "match");

    expect(body.query.filters.type_filters?.filters.rarity?.option).toBe(
      "rare",
    );
  });

  it("uses nonunique in legacy mode", () => {
    const body = buildBody(ItemRarity.Magic, "nonunique");

    expect(body.query.filters.type_filters?.filters.rarity?.option).toBe(
      "nonunique",
    );
  });

  it("omits the rarity option in off mode", () => {
    const body = buildBody(ItemRarity.Magic, "off");

    expect(body.query.filters.type_filters?.filters.rarity?.option).toBeUndefined();
  });

  it("omits the rarity option when the filter chip is toggled off", () => {
    const body = buildBody(ItemRarity.Magic, "match", true);

    expect(body.query.filters.type_filters?.filters.rarity?.option).toBeUndefined();
  });
});
