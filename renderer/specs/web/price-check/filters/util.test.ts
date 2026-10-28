import { describe, expect, it } from "vitest";
import { percentRoll, roundRoll } from "@/web/price-check/filters/util";

// https://github.com/Kvan7/Exiled-Exchange-2/issues/1016
// PoE2 0.5 stats with decimal rolls (dp=true) carry up to 2 decimal places
// at any magnitude, e.g. "+4.95% to Critical Hit Chance" was parsed as 4.9
describe("roundRoll", () => {
  it.each([
    [4.95, 4.95],
    [15.95, 15.95],
    [10.3, 10.3],
    [22.4, 22.4],
    [1.95, 1.95],
    [1.85, 1.85],
    [9.4, 9.4],
    [45, 45],
    [-4.95, -4.95],
    [-22.4, -22.4],
  ])("%#. keeps 2 decimals for dp rolls: %s", (value, expected) => {
    expect(roundRoll(value, true)).toBe(expected);
  });

  it("truncates integer rolls (dp=false)", () => {
    expect(roundRoll(45, false)).toBe(45);
    expect(roundRoll(3.5, false)).toBe(3);
  });
});

describe("percentRoll", () => {
  it("snaps roll bounds to the decimal grid", () => {
    expect(percentRoll(4.41, -0, Math.floor, true)).toBe(4.41);
    expect(percentRoll(4.95, -0, Math.floor, true)).toBe(4.95);
    expect(percentRoll(4.95, +0, Math.ceil, true)).toBe(4.95);
    expect(percentRoll(5, -0, Math.floor, true)).toBe(5);
    expect(percentRoll(5, +0, Math.ceil, true)).toBe(5);
  });

  it("applies search range widening with 2 decimals", () => {
    expect(percentRoll(4.95, -20, Math.floor, true)).toBe(3.96);
    expect(percentRoll(4.95, +20, Math.ceil, true)).toBe(5.94);
  });

  it("keeps integer precision for dp=false", () => {
    expect(percentRoll(3.5, -0, Math.floor, false)).toBe(3);
    expect(percentRoll(3.5, +0, Math.ceil, false)).toBe(4);
  });
});
