// WMO weather code -> icon + i18n key. Shared by server and client components.

export type WxKey = "wx_storm" | "wx_showers" | "wx_rain" | "wx_drizzle" | "wx_fog" | "wx_cloudy" | "wx_partly" | "wx_clear";

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
