import { test } from "node:test";
import assert from "node:assert/strict";
import { climateFit, computeMargin, cropFlag, marginFlag, planWindow, priceFlag, probAbove, suggestCrops, type Normal, type PriceOutlook } from "./recommend.ts";
import type { Crop } from "./catalog.ts";

const wheat: Crop = { key: "wheat", commodity: "atta", name_en: "Wheat", name_bn: "গম", season: "rabi", plant: [11, 12], grow: 4, temp: [12, 25], water: "low" };
const jute: Crop = { key: "jute", commodity: "jute", name_en: "Jute", name_bn: "পাট", season: "kharif1", plant: [3, 4], grow: 4, temp: [24, 35], water: "high", floodTolerant: true };

// Roughly Dhaka's climate.
const normals: Normal[] = [
  [1, 25, 13, 8], [2, 28, 16, 20], [3, 32, 21, 50], [4, 34, 24, 120], [5, 34, 25, 280], [6, 32, 26, 380],
  [7, 31, 26, 420], [8, 32, 26, 340], [9, 32, 26, 300], [10, 31, 24, 170], [11, 29, 19, 30], [12, 26, 14, 10],
].map(([month, tmax, tmin, precip_mm]) => ({ month, tmax, tmin, precip_mm }));

const outlook = (point: number, lo: number, hi: number): PriceOutlook => ({
  horizon: 3,
  point,
  lo,
  hi,
  last: 100,
  quantiles: { "0.05": lo, "0.1": lo + 2, "0.25": point - 3, "0.5": point, "0.75": point + 3, "0.9": hi - 2, "0.95": hi },
  coverage: 0.96,
  nTest: 40,
});

test("wheat fits a Bangladeshi winter", () => {
  assert.ok(climateFit(wheat, 11, normals).fit > 0.8);
});

test("wheat planted in May is a poor fit", () => {
  assert.ok(climateFit(wheat, 5, normals).fit < 0.5);
});

test("only crops planted within the lookahead window are suggested", () => {
  const s = suggestCrops([wheat, jute], 10, normals, () => null);
  assert.deepEqual(s.map((x) => x.crop.key), ["wheat"]);
  assert.equal(s[0].plantMonth, 11);
  assert.equal(s[0].harvestMonth, 3);
});

test("rising price outlook raises the score", () => {
  const up = suggestCrops([wheat], 11, normals, () => outlook(120, 105, 135))[0];
  const down = suggestCrops([wheat], 11, normals, () => outlook(85, 70, 100))[0];
  assert.ok(up.score > down.score);
});

test("probAbove interpolates the quantiles", () => {
  const q = outlook(100, 80, 120).quantiles;
  assert.equal(probAbove(q, 100), 0.5);
  assert.ok(probAbove(q, 60) > 0.95);
  assert.ok(probAbove(q, 150) < 0.05);
});

test("margin accounts for storage cost and losses", () => {
  const m = computeMargin({ buyPrice: 50, holdMonths: 3, storagePctPerMonth: 2, lossPct: 0, outlook: outlook(110, 95, 125) });
  // forecast +10% on a 50 Tk buy -> 55; cost 50 * 1.06 = 53
  assert.equal(m.expectedSell, 55);
  assert.ok(Math.abs(m.breakEven - 53) < 1e-9);
  assert.ok(Math.abs(m.marginPct - (55 - 53) / 53) < 1e-9);
  assert.ok(m.probProfit > 0.5 && m.probProfit < 1);
});


test("price flags need a clear lean, not just a point estimate", () => {
  assert.equal(priceFlag(outlook(110, 100, 120)), "green");
  assert.equal(priceFlag(outlook(90, 80, 100)), "red");
  assert.equal(priceFlag(outlook(101, 80, 125)), "orange");
});

test("margin and crop flags", () => {
  const m = computeMargin({ buyPrice: 100, holdMonths: 3, storagePctPerMonth: 1, lossPct: 0, outlook: outlook(115, 108, 122) });
  assert.equal(marginFlag(m), "green");
  const bad = computeMargin({ buyPrice: 100, holdMonths: 6, storagePctPerMonth: 3, lossPct: 5, outlook: outlook(100, 90, 110) });
  assert.equal(marginFlag(bad), "red");
  assert.equal(cropFlag({ climateFit: 0.95, priceChange: 0.06 }), "green");
  assert.equal(cropFlag({ climateFit: 0.9, priceChange: 0 }), "orange");
  assert.equal(cropFlag({ climateFit: 0.4, priceChange: 0.2 }), "red");
});

test("12-month crop plan windows", () => {
  assert.deepEqual([0, 2, 3, 5, 6, 11].map(planWindow), ["now", "now", "soon", "soon", "later", "later"]);
  // With a 12-month lookahead every crop is placed somewhere in the year.
  assert.equal(suggestCrops([wheat, jute], 10, normals, () => null, 11).length, 2);
});
