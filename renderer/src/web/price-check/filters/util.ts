function decimalPlaces(dp: number | boolean): number {
  if (typeof dp === "number") {
    return dp;
  } else {
    return dp ? 2 : 0;
  }
}

// e.g. 4.95 is stored as 4.9499...93 in binary, so scaling + trunc without
// nudging back onto the decimal grid returns 4.94 instead of 4.95.
// nudge down for ceil, up for floor/trunc, so values that sit exactly
// on the grid don't cross to the neighboring cell
function ontoDecimalGrid(value: number, dir: 1 | -1): number {
  return value + dir * Math.abs(value) * 1e-9;
}

export function roundRoll(value: number, dp: boolean) {
  const rounding = Math.pow(10, decimalPlaces(dp));
  return (
    Math.trunc(ontoDecimalGrid(value, value < 0 ? -1 : 1) * rounding) / rounding
  );
}

export function percentRoll(
  value: number,
  p: number,
  method: Math["floor"] | Math["ceil"],
  dp: number | boolean = false,
): number {
  const res = value + (Math.abs(value) * p) / 100;
  const rounding = Math.pow(10, decimalPlaces(dp));
  return (
    method(ontoDecimalGrid(res, method === Math.floor ? 1 : -1) * rounding) /
    rounding
  );
}

export function percentRollDelta(
  value: number,
  delta: number,
  p: number,
  method: Math["floor"] | Math["ceil"],
  dp = false,
): number {
  const res = value + (delta * p) / 100;
  const rounding = Math.pow(10, decimalPlaces(dp));
  return (
    method(ontoDecimalGrid(res, method === Math.floor ? 1 : -1) * rounding) /
    rounding
  );
}
