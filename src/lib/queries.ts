import "server-only";
import { getDb } from "./db";
import { COMMODITY_BY_KEY } from "./catalog";
import type { Normal, PriceOutlook } from "./recommend";
import { bdToday, monthsBetween } from "./time";

export type ForecastRow = {
  commodity: string;
  issued_date: string;
  horizon: number;
  series_source: string;
  last_month: string;
  target_month: string;
  point: number;
  lo: number;
  hi: number;
  quantiles: Record<string, number>;
  model: string;
  mape: number | null;
  coverage: number | null;
  direction_accuracy: number | null;
  n_calibration: number;
  n_test: number;
  n_points: number;
};

/** Latest forecast run per commodity, all horizons. */
export async function latestForecasts(): Promise<Map<string, { rows: ForecastRow[]; last: number }>> {
  const sql = await getDb();
  const rows = (await sql`
    SELECT f.commodity, f.issued_date::text, f.horizon, f.series_source, f.last_month, f.target_month,
           f.point::float, f.lo::float, f.hi::float, f.quantiles, f.model, f.mape, f.coverage, f.direction_accuracy,
           f.n_calibration, f.n_test, f.n_points
    FROM price_forecasts f
    JOIN (SELECT commodity, MAX(issued_date) AS d FROM price_forecasts GROUP BY commodity) l
      ON l.commodity = f.commodity AND l.d = f.issued_date
    ORDER BY f.commodity, f.horizon
  `) as ForecastRow[];
  const lastVals = (await sql`
    SELECT DISTINCT ON (commodity) commodity, series_source, last_month FROM price_forecasts ORDER BY commodity, issued_date DESC
  `) as { commodity: string; series_source: string; last_month: string }[];

  const out = new Map<string, { rows: ForecastRow[]; last: number }>();
  for (const r of rows) {
    const e = out.get(r.commodity) ?? { rows: [], last: 0 };
    e.rows.push(r);
    out.set(r.commodity, e);
  }
  // The series' last observed value, needed to turn forecasts into relative changes.
  for (const lv of lastVals) {
    const e = out.get(lv.commodity);
    if (!e) continue;
    const hist = await priceHistory(lv.commodity, lv.series_source, 1, lv.last_month);
    e.last = hist.at(-1)?.v ?? e.rows[0]?.point ?? 0;
  }
  return out;
}

/** Forecast for `monthsAhead` months after the current month, as a relative outlook. */
export function outlookFrom(entry: { rows: ForecastRow[]; last: number } | undefined, monthsAhead: number): PriceOutlook | null {
  if (!entry || !entry.rows.length || !entry.last) return null;
  const nowYm = bdToday().slice(0, 7);
  const h = monthsBetween(entry.rows[0].last_month, nowYm) + monthsAhead;
  const r = entry.rows.find((x) => x.horizon === h);
  if (!r) return null;
  return { horizon: h, point: r.point, lo: r.lo, hi: r.hi, last: entry.last, quantiles: r.quantiles, coverage: r.coverage, nTest: r.n_test };
}

export async function priceHistory(commodity: string, source: string, months = 36, untilMonth?: string): Promise<{ m: string; v: number }[]> {
  const sql = await getDb();
  const until = untilMonth ?? "9999-12";
  if (source === "crowd") {
    return ((await sql`
      SELECT to_char(report_date, 'YYYY-MM') AS m, percentile_cont(0.5) WITHIN GROUP (ORDER BY price)::float AS v
      FROM price_reports WHERE commodity = ${commodity} AND price_type = 'retail' AND NOT flagged
        AND to_char(report_date, 'YYYY-MM') <= ${until}
      GROUP BY 1 ORDER BY 1 DESC LIMIT ${months}
    `) as { m: string; v: number }[]).reverse();
  }
  const sources = source === "retail" ? ["chaldal", "shwapno"] : [source];
  return ((await sql`
    SELECT to_char(obs_date, 'YYYY-MM') AS m, percentile_cont(0.5) WITHIN GROUP (ORDER BY price)::float AS v
    FROM ext_prices WHERE source = ANY(${sources}::text[]) AND commodity = ${commodity} AND price_type = 'retail'
      AND to_char(obs_date, 'YYYY-MM') <= ${until}
    GROUP BY 1 ORDER BY 1 DESC LIMIT ${months}
  `) as { m: string; v: number }[]).reverse();
}

type SourcePrice = { date: string; price: number; min: number | null; max: number | null };

export type CurrentPrice = {
  commodity: string;
  tcb: SourcePrice | null;
  chaldal: SourcePrice | null;
  shwapno: SourcePrice | null;
  wfp: { month: string; price: number } | null;
  crowd: { price: number; n: number } | null; // district, last 7 days
  /** Mean of the regular (non-discounted) retail prices seen in the last 3 days (TCB, Chaldal, Shwapno). */
  avg: { price: number; sources: string[] } | null;
};

const RETAIL_SOURCES = ["tcb", "chaldal", "shwapno"] as const;

export async function currentPrices(district: string): Promise<Map<string, CurrentPrice>> {
  const sql = await getDb();
  const latest = (await sql`
    SELECT DISTINCT ON (source, commodity) source, commodity, obs_date::text AS date, price::float, price_min::float AS min, price_max::float AS max
    FROM ext_prices WHERE source IN ('tcb', 'chaldal', 'shwapno') ORDER BY source, commodity, obs_date DESC
  `) as ({ source: (typeof RETAIL_SOURCES)[number]; commodity: string } & SourcePrice)[];
  const wfp = (await sql`
    WITH l AS (SELECT commodity, MAX(obs_date) AS d FROM ext_prices WHERE source = 'wfp' GROUP BY commodity)
    SELECT e.commodity, to_char(l.d, 'YYYY-MM') AS month, percentile_cont(0.5) WITHIN GROUP (ORDER BY e.price)::float AS price
    FROM ext_prices e JOIN l ON l.commodity = e.commodity AND l.d = e.obs_date
    WHERE e.source = 'wfp' GROUP BY e.commodity, l.d
  `) as { commodity: string; month: string; price: number }[];
  const crowd = (await sql`
    SELECT commodity, percentile_cont(0.5) WITHIN GROUP (ORDER BY price)::float AS price, COUNT(*)::int AS n
    FROM price_reports
    WHERE district = ${district} AND price_type = 'retail' AND NOT flagged AND report_date >= ${bdToday()}::date - 7
    GROUP BY commodity
  `) as { commodity: string; price: number; n: number }[];

  const out = new Map<string, CurrentPrice>();
  const get = (k: string) =>
    out.get(k) ?? out.set(k, { commodity: k, tcb: null, chaldal: null, shwapno: null, wfp: null, crowd: null, avg: null }).get(k)!;
  for (const r of latest) get(r.commodity)[r.source] = { date: r.date, price: r.price, min: r.min, max: r.max };
  for (const r of wfp) get(r.commodity).wfp = { month: r.month, price: r.price };
  for (const r of crowd) get(r.commodity).crowd = { price: r.price, n: r.n };
  const recent = Date.parse(bdToday()) - 3 * 86400_000;
  for (const cp of out.values()) {
    const fresh = RETAIL_SOURCES.filter((s) => cp[s] && Date.parse(cp[s]!.date) >= recent);
    if (fresh.length) cp.avg = { price: fresh.reduce((a, s) => a + cp[s]!.price, 0) / fresh.length, sources: [...fresh] };
  }
  return out;
}

/** Best available "price right now" for centring sliders and margin defaults. */
export function referencePrice(commodity: string, cp: CurrentPrice | undefined): number {
  return cp?.crowd?.price ?? cp?.avg?.price ?? cp?.tcb?.price ?? cp?.wfp?.price ?? COMMODITY_BY_KEY.get(commodity)?.ref ?? 100;
}

export type DayForecast = { date: string; tmax: number | null; tmin: number | null; precip_mm: number | null; precip_prob: number | null; wind_max: number | null; weather_code: number | null };

export async function weatherForecast(district: string, days = 7): Promise<DayForecast[]> {
  const sql = await getDb();
  return (await sql`
    SELECT target_date::text AS date, tmax, tmin, precip_mm, precip_prob, wind_max, weather_code
    FROM weather_forecasts
    WHERE district = ${district}
      AND issued_date = (SELECT MAX(issued_date) FROM weather_forecasts WHERE district = ${district})
      AND target_date >= ${bdToday()}::date
    ORDER BY target_date LIMIT ${days}
  `) as DayForecast[];
}

export async function localReportsToday(district: string) {
  const sql = await getDb();
  const rows = (await sql`
    SELECT COUNT(*)::int AS n,
           COUNT(*) FILTER (WHERE rain <> 'none')::int AS rain,
           COUNT(*) FILTER (WHERE rain = 'heavy')::int AS heavy,
           COUNT(*) FILTER (WHERE storm)::int AS storm,
           AVG(heat)::float AS heat
    FROM weather_reports WHERE district = ${district} AND report_date = ${bdToday()}
  `) as { n: number; rain: number; heavy: number; storm: number; heat: number | null }[];
  return rows[0];
}

export async function climateNormals(division: string): Promise<Normal[]> {
  const sql = await getDb();
  return (await sql`SELECT month, tmax, tmin, precip_mm FROM climate_normals WHERE division = ${division} ORDER BY month`) as Normal[];
}

export async function weatherAccuracy() {
  const sql = await getDb();
  const rows = (await sql`
    SELECT COUNT(*)::int AS n,
           AVG(CASE WHEN (f.precip_mm >= 1) = (o.precip_mm >= 1) THEN 1 ELSE 0 END)::float AS rain_hit,
           AVG(ABS(f.tmax - o.tmax))::float AS tmax_mae
    FROM weather_forecasts f
    JOIN weather_observed o ON o.district = f.district AND o.obs_date = f.target_date
    WHERE f.target_date = f.issued_date + 1 AND f.issued_date >= ${bdToday()}::date - 60
  `) as { n: number; rain_hit: number | null; tmax_mae: number | null }[];
  const crowd = (await sql`
    SELECT COUNT(*)::int AS n,
           AVG(CASE WHEN (w.rain <> 'none') = (o.precip_mm >= 1) THEN 1 ELSE 0 END)::float AS agree
    FROM weather_reports w
    JOIN weather_observed o ON o.district = w.district AND o.obs_date = w.report_date
    WHERE w.slot = 3
  `) as { n: number; agree: number | null }[];
  return { forecast: rows[0], crowd: crowd[0] };
}

export async function sourceStatus() {
  const sql = await getDb();
  return (await sql`
    SELECT DISTINCT ON (source) source, started_at::text, ok, rows, message
    FROM source_runs ORDER BY source, started_at DESC
  `) as { source: string; started_at: string; ok: boolean; rows: number; message: string | null }[];
}

export async function communityStats() {
  const sql = await getDb();
  const rows = (await sql`
    SELECT (SELECT COUNT(*)::int FROM devices) AS devices,
           (SELECT COUNT(*)::int FROM weather_reports) AS weather,
           (SELECT COUNT(*)::int FROM price_reports) AS prices
  `) as { devices: number; weather: number; prices: number }[];
  return rows[0];
}

/** Monthly climate for a district from its stored 5-year daily history (needs >= 3 years). */
export async function districtNormals(district: string): Promise<Normal[]> {
  const sql = await getDb();
  return (await sql`
    SELECT EXTRACT(MONTH FROM obs_date)::int AS month, AVG(tmax)::float AS tmax, AVG(tmin)::float AS tmin,
           (SUM(precip_mm) / COUNT(DISTINCT EXTRACT(YEAR FROM obs_date)))::float AS precip_mm
    FROM weather_observed WHERE district = ${district} AND obs_date >= '2021-01-01'
    GROUP BY 1 HAVING COUNT(DISTINCT EXTRACT(YEAR FROM obs_date)) >= 3 ORDER BY 1
  `) as Normal[];
}

/** This month so far vs the same days in each of the previous 5 years. */
export async function monthVsHistory(district: string) {
  const sql = await getDb();
  const today = bdToday();
  const rows = (await sql`
    WITH d AS (
      SELECT EXTRACT(YEAR FROM obs_date)::int AS y, precip_mm, tmax
      FROM weather_observed
      WHERE district = ${district}
        AND EXTRACT(MONTH FROM obs_date) = EXTRACT(MONTH FROM ${today}::date)
        AND EXTRACT(DAY FROM obs_date) <= EXTRACT(DAY FROM ${today}::date)
        AND obs_date >= ${today}::date - INTERVAL '6 years'
    )
    SELECT y, SUM(precip_mm)::float AS rain, AVG(tmax)::float AS tmax, COUNT(*)::int AS days FROM d GROUP BY y ORDER BY y
  `) as { y: number; rain: number; tmax: number; days: number }[];
  const year = Number(today.slice(0, 4));
  const now = rows.find((r) => r.y === year) ?? null;
  const past = rows.filter((r) => r.y < year && r.days >= 10);
  if (!now || past.length < 3) return null;
  return {
    rainNow: now.rain,
    rainAvg: past.reduce((a, r) => a + r.rain, 0) / past.length,
    tmaxNow: now.tmax,
    tmaxAvg: past.reduce((a, r) => a + r.tmax, 0) / past.length,
    years: past.length,
  };
}

export async function historyCoverage() {
  const sql = await getDb();
  const r = (await sql`
    SELECT COUNT(DISTINCT district)::int AS districts, MIN(obs_date)::text AS since, COUNT(*)::int AS days
    FROM weather_observed WHERE obs_date >= '2021-01-01'
  `) as { districts: number; since: string | null; days: number }[];
  return r[0];
}

/** How far back stored price history reaches (TCB archive / WFP), in years. */
export async function historySpan(): Promise<{ since: string | null; years: number | null }> {
  const sql = await getDb();
  const r = (await sql`SELECT MIN(obs_date)::text AS since FROM ext_prices WHERE source = 'tcb'`) as { since: string | null }[];
  const since = r[0]?.since ?? null;
  return { since, years: since ? (Date.parse(bdToday()) - Date.parse(since)) / (365.25 * 86400_000) : null };
}
