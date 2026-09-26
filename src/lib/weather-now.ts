import "server-only";
import { getDb } from "./db";

// Current conditions at the user's GPS point (or district centre), from
// Open-Meteo. Cached per ~5 km grid cell for 20 minutes so page views don't
// each hit the API.

export type WeatherNow = {
  temp: number;
  feels: number;
  humidity: number;
  precip: number;
  code: number;
  wind: number;
  isDay: boolean;
  time: string;
  todayMax: number | null;
  todayMin: number | null;
  rainChance: number | null;
};

const TTL_MS = 20 * 60 * 1000;

export async function weatherNow(lat: number, lon: number): Promise<WeatherNow | null> {
  const gLat = Math.round(lat * 20) / 20;
  const gLon = Math.round(lon * 20) / 20;
  const key = `${gLat},${gLon}`;
  const sql = await getDb();
  const cached = (await sql`SELECT fetched_at, data FROM weather_now WHERE key = ${key}`) as { fetched_at: string; data: WeatherNow }[];
  if (cached[0] && Date.now() - new Date(cached[0].fetched_at).getTime() < TTL_MS) return cached[0].data;

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${gLat}&longitude=${gLon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=Asia%2FDhaka`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = (await res.json()) as {
      current: Record<string, number | string>;
      daily: { temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: (number | null)[] };
    };
    const c = j.current;
    const data: WeatherNow = {
      temp: Number(c.temperature_2m),
      feels: Number(c.apparent_temperature),
      humidity: Number(c.relative_humidity_2m),
      precip: Number(c.precipitation),
      code: Number(c.weather_code),
      wind: Number(c.wind_speed_10m),
      isDay: Number(c.is_day) === 1,
      time: String(c.time),
      todayMax: j.daily.temperature_2m_max[0] ?? null,
      todayMin: j.daily.temperature_2m_min[0] ?? null,
      rainChance: j.daily.precipitation_probability_max[0] ?? null,
    };
    await sql`
      INSERT INTO weather_now (key, fetched_at, data) VALUES (${key}, now(), ${JSON.stringify(data)}::jsonb)
      ON CONFLICT (key) DO UPDATE SET fetched_at = now(), data = EXCLUDED.data
    `;
    return data;
  } catch {
    return cached[0]?.data ?? null; // stale beats nothing
  }
}

/** WMO weather code -> icon + i18n key. */
export function describeCode(code: number, isDay = true): { icon: string; key: WxKey } {
  if (code >= 95) return { icon: "⛈️", key: "wx_storm" };
  if (code >= 80) return { icon: "🌦️", key: "wx_showers" };
  if (code >= 61) return { icon: "🌧️", key: "wx_rain" };
  if (code >= 51) return { icon: "🌦️", key: "wx_drizzle" };
  if (code >= 45) return { icon: "🌫️", key: "wx_fog" };
  if (code >= 3) return { icon: "☁️", key: "wx_cloudy" };
  if (code >= 1) return { icon: isDay ? "⛅" : "☁️", key: "wx_partly" };
  return { icon: isDay ? "☀️" : "🌙", key: "wx_clear" };
}

export type WxKey = "wx_storm" | "wx_showers" | "wx_rain" | "wx_drizzle" | "wx_fog" | "wx_cloudy" | "wx_partly" | "wx_clear";
