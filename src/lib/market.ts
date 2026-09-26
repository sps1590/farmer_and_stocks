import "server-only";
import { COMMODITIES, CROPS, type Commodity } from "./catalog";
import { DISTRICT_BY_KEY } from "./geo";
import { climateNormals, currentPrices, districtNormals, latestForecasts, outlookFrom, type CurrentPrice } from "./queries";
import { cropFlag, priceFlag, suggestCrops, type CropSuggestion, type Flag, type PriceOutlook } from "./recommend";
import { bdNow } from "./time";

export type MarketRow = {
  c: Commodity;
  price: number | null;
  prices: CurrentPrice | undefined;
  outlook: PriceOutlook | null;
  change: number | null;
  flag: Flag | null;
  verified: boolean;
};

/** Every commodity with today's average price, 3-month outlook and traffic-light flag. */
export async function marketRows(district: string): Promise<MarketRow[]> {
  const [forecasts, prices] = await Promise.all([latestForecasts(), currentPrices(district)]);
  return COMMODITIES.map((c) => {
    const cp = prices.get(c.key);
    const entry = forecasts.get(c.key);
    const outlook = outlookFrom(entry, 3);
    const row3 = entry?.rows.find((r) => r.horizon === outlook?.horizon);
    return {
      c,
      price: cp?.avg?.price ?? cp?.tcb?.price ?? cp?.wfp?.price ?? null,
      prices: cp,
      outlook,
      change: outlook ? outlook.point / outlook.last - 1 : null,
      flag: outlook ? priceFlag(outlook) : null,
      verified: Boolean(row3 && row3.coverage !== null && row3.n_test >= 20),
    };
  });
}

/**
 * Best upside first: green-flagged items, then (if fewer than n) the stable
 * items with the highest expected rise. Each keeps its real flag, so a
 * "stable" item is never presented as profitable.
 */
export function hotItems(rows: MarketRow[], n = 3): MarketRow[] {
  const byChange = (a: MarketRow, b: MarketRow) => (b.change ?? 0) - (a.change ?? 0);
  const green = rows.filter((r) => r.flag === "green").sort(byChange);
  const rising = rows.filter((r) => r.flag === "orange" && (r.change ?? 0) > 0.005).sort(byChange);
  return [...green, ...rising].slice(0, n);
}

export type CropPlanItem = CropSuggestion & { flag: Flag };

/** 12-month crop plan for a district: district 5-year climate when available, else division normals. */
export async function cropPlan(district: string): Promise<CropPlanItem[]> {
  const d = DISTRICT_BY_KEY.get(district)!;
  const [forecasts, local] = await Promise.all([latestForecasts(), districtNormals(district)]);
  const normals = local.length === 12 ? local : await climateNormals(d.division);
  const nowMonth = bdNow().getUTCMonth() + 1;
  return suggestCrops(CROPS, nowMonth, normals, (commodity, ahead) => outlookFrom(forecasts.get(commodity), ahead), 11).map((s) => ({
    ...s,
    flag: cropFlag(s),
  }));
}
