import "server-only";
import { getDb } from "./db";
import { COMMODITIES } from "./catalog";
import { callPy } from "./pyclient";
import { bdToday, monthsBetween } from "./time";

// Builds one monthly series per commodity and asks the Python service for
// forecasts with split-conformal 95% intervals.
//
// Series choice: WFP national median (long multi-market history) when it has
// >= 24 months and is recent; then the online grocers' daily regular prices
// (Chaldal + Shwapno) once >= 18 months exist; then the TCB Dhaka market
// survey; then crowd-reported medians.

type PyHorizon = {
  horizon: number;
  target_month: string;
  point: number;
  lo: number;
  hi: number;
  quantiles: Record<string, number>;
  mape: number | null;
  coverage: number | null;
  direction_accuracy: number | null;
  n_calibration: number;
  n_test: number;
};
type PyResult = { ok: true; model: string; n: number; last_month: string; last_value: number; horizons: PyHorizon[] } | { ok: false; reason: string; n?: number };

type SeriesRow = { m: string; v: number };

async function monthlySeries(source: "wfp" | "retail" | "tcb" | "crowd", commodity: string): Promise<SeriesRow[]> {
  const sql = await getDb();
  if (source === "crowd") {
    return (await sql`
      SELECT to_char(report_date, 'YYYY-MM') AS m, percentile_cont(0.5) WITHIN GROUP (ORDER BY price)::float AS v
      FROM price_reports WHERE commodity = ${commodity} AND price_type = 'retail' AND NOT flagged
      GROUP BY 1 ORDER BY 1
    `) as SeriesRow[];
  }
  // "retail" = the online grocers' daily regular prices (Chaldal + Shwapno).
  const sources = source === "retail" ? ["chaldal", "shwapno"] : [source];
  return (await sql`
    SELECT to_char(obs_date, 'YYYY-MM') AS m, percentile_cont(0.5) WITHIN GROUP (ORDER BY price)::float AS v
    FROM ext_prices WHERE source = ANY(${sources}::text[]) AND commodity = ${commodity} AND price_type = 'retail'
    GROUP BY 1 ORDER BY 1
  `) as SeriesRow[];
}

export async function pickSeries(commodity: string): Promise<{ source: string; rows: SeriesRow[] } | null> {
  const nowYm = bdToday().slice(0, 7);
  // Online-grocer history is preferred over the TCB survey once it is long enough.
  for (const source of ["wfp", "retail", "tcb", "crowd"] as const) {
    const rows = await monthlySeries(source, commodity);
    const fresh = rows.length > 0 && monthsBetween(rows[rows.length - 1].m, nowYm) <= 6;
    const enough = rows.length >= (source === "wfp" ? 24 : 18);
    if (fresh && enough) return { source, rows };
  }
  return null;
}

export async function runForecasts(): Promise<{ rows: number; message?: string }> {
  const series: { key: string; months: string[]; values: number[] }[] = [];
  const sourceOf = new Map<string, string>();
  const skipped: string[] = [];
  for (const c of COMMODITIES) {
    const s = await pickSeries(c.key);
    if (!s) {
      skipped.push(c.key);
      continue;
    }
    sourceOf.set(c.key, s.source);
    series.push({ key: c.key, months: s.rows.map((r) => r.m), values: s.rows.map((r) => r.v) });
  }
  if (!series.length) return { rows: 0, message: `no series with enough data (${skipped.join(",")})` };

  const out = await callPy<{ results: Record<string, PyResult> }>("/api/py/forecast", {
    method: "POST",
    body: { series, horizons: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], level: 0.95 },
    timeoutMs: 120_000,
  });

  const today = bdToday();
  const sql = await getDb();
  let rows = 0;
  for (const [key, r] of Object.entries(out.results)) {
    if (!r.ok) {
      skipped.push(`${key}(${r.reason})`);
      continue;
    }
    for (const h of r.horizons) {
      await sql`
        INSERT INTO price_forecasts (commodity, issued_date, horizon, series_source, last_month, target_month, point, lo, hi, quantiles, model, mape, coverage, direction_accuracy, n_calibration, n_test, n_points)
        VALUES (${key}, ${today}, ${h.horizon}, ${sourceOf.get(key)}, ${r.last_month}, ${h.target_month}, ${h.point}, ${h.lo}, ${h.hi}, ${JSON.stringify(h.quantiles)}, ${r.model}, ${h.mape}, ${h.coverage}, ${h.direction_accuracy}, ${h.n_calibration}, ${h.n_test}, ${r.n})
        ON CONFLICT (commodity, issued_date, horizon) DO UPDATE SET
          series_source = EXCLUDED.series_source, last_month = EXCLUDED.last_month, target_month = EXCLUDED.target_month,
          point = EXCLUDED.point, lo = EXCLUDED.lo, hi = EXCLUDED.hi, quantiles = EXCLUDED.quantiles, model = EXCLUDED.model,
          mape = EXCLUDED.mape, coverage = EXCLUDED.coverage, direction_accuracy = EXCLUDED.direction_accuracy,
          n_calibration = EXCLUDED.n_calibration, n_test = EXCLUDED.n_test, n_points = EXCLUDED.n_points
      `;
      rows++;
    }
  }
  return { rows, message: skipped.length ? `skipped: ${skipped.join(", ")}` : undefined };
}
