import "server-only";
import { getDb } from "../db";
import { DISTRICTS, DIVISIONS } from "../geo";
import { bdToday } from "../time";

// Open-Meteo (https://open-meteo.com): free, no API key, CC-BY 4.0.
// One request covers all 64 districts (comma-separated coordinates).

type DailyBlock = {
  daily: {
    time: string[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_sum: (number | null)[];
    precipitation_probability_max?: (number | null)[];
    wind_speed_10m_max?: (number | null)[];
    weather_code?: (number | null)[];
  };
};

/** GET JSON, retrying transient overload/rate-limit errors (Open-Meteo returns 503/429 under load). */
async function getJson<T>(url: string, attempts = 4): Promise<T> {
  let lastError = "";
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 2000 * 2 ** (i - 1))); // 2s, 4s, 8s
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(60_000) });
    if (res.ok) return (await res.json()) as T;
    lastError = `${url.split("?")[0]} -> HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
    if (res.status !== 429 && res.status < 500) break;
  }
  throw new Error(lastError);
}

export async function ingestWeatherForecast(): Promise<{ rows: number }> {
  const lat = DISTRICTS.map((d) => d.lat).join(",");
  const lon = DISTRICTS.map((d) => d.lon).join(",");
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,weather_code` +
    `&timezone=Asia%2FDhaka&past_days=3&forecast_days=16`;
  const data = await getJson<DailyBlock[] | DailyBlock>(url);
  const blocks = Array.isArray(data) ? data : [data];
  if (blocks.length !== DISTRICTS.length) throw new Error(`expected ${DISTRICTS.length} locations, got ${blocks.length}`);

  const today = bdToday();
  const f = { district: [] as string[], target: [] as string[], tmax: [] as (number | null)[], tmin: [] as (number | null)[], precip: [] as (number | null)[], prob: [] as (number | null)[], wind: [] as (number | null)[], code: [] as (number | null)[] };
  const o = { district: [] as string[], date: [] as string[], tmax: [] as (number | null)[], tmin: [] as (number | null)[], precip: [] as (number | null)[] };

  blocks.forEach((b, i) => {
    const key = DISTRICTS[i].key;
    b.daily.time.forEach((t, j) => {
      if (t < today) {
        o.district.push(key);
        o.date.push(t);
        o.tmax.push(b.daily.temperature_2m_max[j]);
        o.tmin.push(b.daily.temperature_2m_min[j]);
        o.precip.push(b.daily.precipitation_sum[j]);
      } else {
        f.district.push(key);
        f.target.push(t);
        f.tmax.push(b.daily.temperature_2m_max[j]);
        f.tmin.push(b.daily.temperature_2m_min[j]);
        f.precip.push(b.daily.precipitation_sum[j]);
        f.prob.push(b.daily.precipitation_probability_max?.[j] ?? null);
        f.wind.push(b.daily.wind_speed_10m_max?.[j] ?? null);
        f.code.push(b.daily.weather_code?.[j] ?? null);
      }
    });
  });

  const sql = await getDb();
  await sql`
    INSERT INTO weather_forecasts (district, issued_date, target_date, tmax, tmin, precip_mm, precip_prob, wind_max, weather_code)
    SELECT d, ${today}::date, t, x, n, p, pr, w, c
    FROM unnest(${f.district}::text[], ${f.target}::date[], ${f.tmax}::real[], ${f.tmin}::real[], ${f.precip}::real[], ${f.prob}::real[], ${f.wind}::real[], ${f.code}::smallint[])
      AS u(d, t, x, n, p, pr, w, c)
    ON CONFLICT (district, issued_date, target_date) DO UPDATE SET
      tmax = EXCLUDED.tmax, tmin = EXCLUDED.tmin, precip_mm = EXCLUDED.precip_mm,
      precip_prob = EXCLUDED.precip_prob, wind_max = EXCLUDED.wind_max, weather_code = EXCLUDED.weather_code
  `;
  await sql`
    INSERT INTO weather_observed (district, obs_date, tmax, tmin, precip_mm)
    SELECT d, t, x, n, p FROM unnest(${o.district}::text[], ${o.date}::date[], ${o.tmax}::real[], ${o.tmin}::real[], ${o.precip}::real[]) AS u(d, t, x, n, p)
    ON CONFLICT (district, obs_date) DO UPDATE SET tmax = EXCLUDED.tmax, tmin = EXCLUDED.tmin, precip_mm = EXCLUDED.precip_mm
  `;
  // Keep the table small: forecasts older than 60 days are only needed as accuracy history for 1-day-ahead.
  await sql`DELETE FROM weather_forecasts WHERE issued_date < ${today}::date - 60 AND target_date <> issued_date + 1`;
  return { rows: f.district.length + o.district.length };
}

/** Monthly climate normals per division from 10 years of Open-Meteo archive data. Runs once. */
export async function ingestClimateNormals(): Promise<{ rows: number; message?: string }> {
  const sql = await getDb();
  const existing = (await sql`SELECT COUNT(*)::int AS c FROM climate_normals`) as { c: number }[];
  if (existing[0].c >= DIVISIONS.length * 12) return { rows: 0, message: "already present" };

  const lat = DIVISIONS.map((d) => d.lat).join(",");
  const lon = DIVISIONS.map((d) => d.lon).join(",");
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
    `&start_date=2016-01-01&end_date=2025-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FDhaka`;
  const data = await getJson<DailyBlock[] | DailyBlock>(url);
  const blocks = Array.isArray(data) ? data : [data];

  const div: string[] = [], month: number[] = [], tmax: number[] = [], tmin: number[] = [], precip: number[] = [];
  blocks.forEach((b, i) => {
    // Sum per (year, month) first, then average across years.
    const acc = new Map<string, { tx: number; tn: number; p: number; n: number }>();
    b.daily.time.forEach((t, j) => {
      const ym = t.slice(0, 7);
      const a = acc.get(ym) ?? { tx: 0, tn: 0, p: 0, n: 0 };
      a.tx += b.daily.temperature_2m_max[j] ?? 0;
      a.tn += b.daily.temperature_2m_min[j] ?? 0;
      a.p += b.daily.precipitation_sum[j] ?? 0;
      a.n += 1;
      acc.set(ym, a);
    });
    for (let m = 1; m <= 12; m++) {
      const ms = [...acc.entries()].filter(([ym]) => Number(ym.slice(5, 7)) === m).map(([, v]) => v);
      if (!ms.length) continue;
      div.push(DIVISIONS[i].key);
      month.push(m);
      tmax.push(ms.reduce((s, v) => s + v.tx / v.n, 0) / ms.length);
      tmin.push(ms.reduce((s, v) => s + v.tn / v.n, 0) / ms.length);
      precip.push(ms.reduce((s, v) => s + v.p, 0) / ms.length);
    }
  });

  await sql`
    INSERT INTO climate_normals (division, month, tmax, tmin, precip_mm, years)
    SELECT d, m, x, n, p, 10 FROM unnest(${div}::text[], ${month}::smallint[], ${tmax}::real[], ${tmin}::real[], ${precip}::real[]) AS u(d, m, x, n, p)
    ON CONFLICT (division, month) DO UPDATE SET tmax = EXCLUDED.tmax, tmin = EXCLUDED.tmin, precip_mm = EXCLUDED.precip_mm, years = EXCLUDED.years
  `;
  return { rows: div.length };
}
