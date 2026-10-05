import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBrief, type BriefInput } from "./brief.ts";

const base: BriefInput = { weather: null, mover: null, crop: null, outlook: null, checkedIn: true, pricesFresh: true };

test("weather line picks the most important condition", () => {
  const w = (weather: BriefInput["weather"]) => buildBrief({ ...base, weather }).lines[0].key;
  assert.equal(w({ code: 96, rainChance: 90, tmax: 30 }), "brief_storm");
  assert.equal(w({ code: 61, rainChance: 80, tmax: 30 }), "brief_rain_likely");
  assert.equal(w({ code: 1, rainChance: 30, tmax: 38 }), "brief_hot");
  assert.equal(w({ code: 0, rainChance: 10, tmax: 31 }), "brief_dry");
  assert.equal(w({ code: 2, rainChance: 45, tmax: 31 }), "brief_rain_possible");
});

test("small price moves and stable outlooks stay out of the brief", () => {
  const b = buildBrief({
    ...base,
    mover: { key: "rice", name: "Rice", change: 0.004 },
    outlook: { key: "rice", name: "Rice", change: 0.01, flag: "orange" },
  });
  assert.equal(b.lines.length, 0);
});

test("lines link to the relevant page and are capped at three", () => {
  const b = buildBrief({
    ...base,
    weather: { code: 0, rainChance: 5, tmax: 30 },
    mover: { key: "onion", name: "Onion", change: -0.06 },
    crop: { name: "Lentil", flag: "green" },
    outlook: { key: "potato", name: "Potato", change: 0.15, flag: "green" },
  });
  assert.deepEqual(b.lines.map((l) => l.key), ["brief_dry", "brief_down", "brief_plant"]);
  assert.equal(b.lines[1].href, "/market/onion");
  assert.equal(b.lines[1].vars.pct, 0.06);
});

test("the next action follows: check in, then refresh prices, then act", () => {
  assert.equal(buildBrief({ ...base, checkedIn: false, pricesFresh: false }).action.key, "act_checkin");
  assert.equal(buildBrief({ ...base, pricesFresh: false }).action.key, "act_update");
  assert.equal(buildBrief({ ...base, crop: { name: "Wheat", flag: "orange" } }).action.key, "act_plan");
  assert.equal(buildBrief(base).action.key, "act_market");
});
