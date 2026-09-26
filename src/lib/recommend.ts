// Pure scoring logic for farmer crop suggestions and trader margins.
// No I/O here so it's easy to unit-test and reason about.

import type { Crop } from "./catalog";

export type Normal = { month: number; tmax: number; tmin: number; precip_mm: number };

export type PriceOutlook = {
  /** Months from the series' last observed month to the target month. */
  horizon: number;
  point: number;
  lo: number;
  hi: number;
  last: number;
  quantiles: Record<string, number>;
  coverage: number | null;
  nTest: number;
};

export type CropSuggestion = {
  crop: Crop;
  plantMonth: number;
  harvestMonth: number;
  monthsToPlant: number;
  score: number;
  climateFit: number;
  priceChange: number | null;
  priceLo: number | null;
  priceHi: number | null;
  certainty: number | null;
  reasons: string[]; // i18n keys
};

/** 0..1 — how well monthly mean temperatures over the growing window suit the crop. */
export function climateFit(crop: Crop, plantMonth: number, normals: Normal[]): { fit: number; reasons: string[] } {
  if (!normals.length) return { fit: 0.5, reasons: ["reason_no_climate"] };
  const byMonth = new Map(normals.map((n) => [n.month, n]));
  let score = 0;
  let wet = 0;
  const reasons: string[] = [];
  for (let i = 0; i < crop.grow; i++) {
    const m = ((plantMonth - 1 + i) % 12) + 1;
    const n = byMonth.get(m);
    if (!n) continue;
    const mean = (n.tmax + n.tmin) / 2;
    const [lo, hi] = crop.temp;
    const miss = mean < lo ? lo - mean : mean > hi ? mean - hi : 0;
    score += Math.max(0, 1 - miss / 6); // 6 °C outside the band = unsuitable
    wet += n.precip_mm;
  }
  let fit = score / crop.grow;
  const avgRain = wet / crop.grow;
  if (!crop.floodTolerant && avgRain > 350) {
    fit *= 0.75;
    reasons.push("reason_heavy_rain");
  }
  if (crop.water === "high" && avgRain < 60) reasons.push("reason_needs_irrigation");
  reasons.unshift(fit >= 0.85 ? "reason_climate_good" : fit >= 0.6 ? "reason_climate_ok" : "reason_climate_poor");
  return { fit, reasons };
}

/**
 * Rank crops whose planting window opens within the next `lookahead` months.
 * Score = 55% climate fit + 30% expected price change at harvest + 15% certainty.
 */
export function suggestCrops(
  crops: Crop[],
  nowMonth: number,
  normals: Normal[],
  outlookFor: (commodity: string, monthsAhead: number) => PriceOutlook | null,
  lookahead = 3,
): CropSuggestion[] {
  const out: CropSuggestion[] = [];
  for (const crop of crops) {
    let best: number | null = null;
    for (let k = 0; k <= lookahead; k++) {
      const m = ((nowMonth - 1 + k) % 12) + 1;
      if (crop.plant.includes(m)) {
        best = k;
        break;
      }
    }
    if (best === null) continue;
    const plantMonth = ((nowMonth - 1 + best) % 12) + 1;
    const harvestMonth = ((plantMonth - 1 + crop.grow) % 12) + 1;
    const { fit, reasons } = climateFit(crop, plantMonth, normals);

    const outlook = outlookFor(crop.commodity, best + crop.grow);
    let priceChange: number | null = null;
    let certainty: number | null = null;
    if (outlook) {
      priceChange = outlook.point / outlook.last - 1;
      certainty = Math.max(0, 1 - (outlook.hi - outlook.lo) / outlook.point / 2);
      reasons.push(priceChange > 0.03 ? "reason_price_up" : priceChange < -0.03 ? "reason_price_down" : "reason_price_flat");
    } else {
      reasons.push("reason_no_price_forecast");
    }
    const priceScore = priceChange === null ? 0.5 : Math.min(1, Math.max(0, 0.5 + priceChange * 2.5));
    const score = 0.55 * fit + 0.3 * priceScore + 0.15 * (certainty ?? 0.3);
    out.push({
      crop,
      plantMonth,
      harvestMonth,
      monthsToPlant: best,
      score,
      climateFit: fit,
      priceChange,
      priceLo: outlook ? outlook.lo / outlook.last - 1 : null,
      priceHi: outlook ? outlook.hi / outlook.last - 1 : null,
      certainty,
      reasons,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

export type MarginInput = {
  buyPrice: number;
  holdMonths: number;
  storagePctPerMonth: number; // e.g. 1.5 = 1.5% of buy price per month
  lossPct: number; // shrinkage / spoilage over the whole hold, %
  outlook: PriceOutlook;
};

export type MarginResult = {
  breakEven: number;
  expectedSell: number;
  sellLo: number;
  sellHi: number;
  marginPct: number;
  marginLoPct: number;
  marginHiPct: number;
  probProfit: number;
};

/** Interpolated P(price > x) from the forecast's empirical quantiles. */
export function probAbove(quantiles: Record<string, number>, x: number): number {
  const pts = Object.entries(quantiles)
    .map(([p, v]) => [Number(p), v] as const)
    .sort((a, b) => a[0] - b[0]);
  if (!pts.length) return 0.5;
  if (x <= pts[0][1]) return 1 - pts[0][0] / 2; // beyond the lowest quantile: extrapolate conservatively
  if (x >= pts[pts.length - 1][1]) return (1 - pts[pts.length - 1][0]) / 2;
  for (let i = 1; i < pts.length; i++) {
    const [p0, v0] = pts[i - 1];
    const [p1, v1] = pts[i];
    if (x <= v1) {
      const t = v1 === v0 ? 0 : (x - v0) / (v1 - v0);
      return 1 - (p0 + t * (p1 - p0));
    }
  }
  return 0;
}

/**
 * Margin for buying now and selling after `holdMonths`. The forecast is used
 * as a relative change from the series' last value, then applied to the
 * trader's own buy price, so it works for any local market level.
 */
export function computeMargin(i: MarginInput): MarginResult {
  const { outlook } = i;
  const scale = i.buyPrice / outlook.last;
  const keep = 1 - i.lossPct / 100;
  const cost = i.buyPrice * (1 + (i.storagePctPerMonth / 100) * i.holdMonths);
  const breakEven = cost / keep;
  const expectedSell = outlook.point * scale;
  const sellLo = outlook.lo * scale;
  const sellHi = outlook.hi * scale;
  const pct = (sell: number) => (sell * keep - cost) / cost;
  return {
    breakEven,
    expectedSell,
    sellLo,
    sellHi,
    marginPct: pct(expectedSell),
    marginLoPct: pct(sellLo),
    marginHiPct: pct(sellHi),
    probProfit: probAbove(outlook.quantiles, breakEven / scale),
  };
}

// ---------------------------------------------------------------------------
// Traffic-light flags. Always shown with an icon + label, never colour alone.
//   green  = likely profitable / price rising
//   orange = stable / uncertain
//   red    = likely loss / price falling
// ---------------------------------------------------------------------------

export type Flag = "green" | "orange" | "red";

/** Price direction over the outlook horizon, requiring the model to lean clearly one way. */
export function priceFlag(o: PriceOutlook): Flag {
  const change = o.point / o.last - 1;
  const pUp = probAbove(o.quantiles, o.last);
  if (change >= 0.03 && pUp >= 0.55) return "green";
  if (change <= -0.03 && pUp <= 0.45) return "red";
  return "orange";
}

/** Buy-now / sell-later trade after storage costs and losses. */
export function marginFlag(m: MarginResult): Flag {
  if (m.marginPct > 0.02 && m.probProfit >= 0.55) return "green";
  if (m.marginPct < -0.02 && m.probProfit < 0.45) return "red";
  return "orange";
}

/** Crop to plant: good climate fit and a harvest price that isn't expected to fall. */
export function cropFlag(s: Pick<CropSuggestion, "climateFit" | "priceChange">): Flag {
  const change = s.priceChange ?? 0;
  if (s.climateFit < 0.6 || change <= -0.08) return "red";
  if (s.climateFit >= 0.8 && change >= 0.03) return "green";
  return "orange";
}

/** Planting window buckets for the 12-month crop plan. */
export function planWindow(monthsToPlant: number): "now" | "soon" | "later" {
  return monthsToPlant <= 2 ? "now" : monthsToPlant <= 5 ? "soon" : "later";
}

/** Display order: profit, then loss, then stable (items without a flag last). */
export const FLAG_ORDER: Record<Flag | "none", number> = { green: 0, red: 1, orange: 2, none: 3 };

/**
 * Sort comparator for flagged items. Within profit the biggest gain comes
 * first, within loss the biggest drop, within stable the highest change.
 */
export function compareFlagged(a: { flag: Flag | null; value: number | null }, b: { flag: Flag | null; value: number | null }): number {
  const rank = FLAG_ORDER[a.flag ?? "none"] - FLAG_ORDER[b.flag ?? "none"];
  if (rank) return rank;
  const av = a.value ?? 0;
  const bv = b.value ?? 0;
  return a.flag === "red" ? av - bv : bv - av;
}
