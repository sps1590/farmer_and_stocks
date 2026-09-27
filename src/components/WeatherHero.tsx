import { describeCode, weatherNow } from "@/lib/weather-now";
import { weatherForecast } from "@/lib/queries";
import { DISTRICT_BY_KEY } from "@/lib/geo";
import { dayName, fmtNum, t, type Lang } from "@/lib/i18n";

/** Big "weather now" card plus a 7-day strip. */
export async function WeatherHero({ lang, district, lat, lon, placeLabel }: { lang: Lang; district: string; lat: number | null; lon: number | null; placeLabel: string }) {
  const d = DISTRICT_BY_KEY.get(district)!;
  const [now, days] = await Promise.all([weatherNow(lat ?? d.lat, lon ?? d.lon), weatherForecast(district, 7)]);
  const desc = now ? describeCode(now.code, now.isDay) : null;
  const tone = !now ? "" : now.code >= 51 ? "hero-rain" : now.isDay ? "" : "hero-night";

  return (
    <section className={`hero ${tone} rise p-5`} aria-label={t(lang, "weather_now")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold opacity-90">📍 {placeLabel}</p>
          {now ? (
            <>
              <p className="big-num mt-2 text-7xl font-bold leading-none">{fmtNum(lang, now.temp)}°</p>
              <p className="mt-2 text-lg font-semibold opacity-95">{t(lang, desc!.key)}</p>
            </>
          ) : (
            <p className="mt-2 font-semibold">{t(lang, "no_weather_yet")}</p>
          )}
        </div>
        {desc && (
          <p className="text-7xl leading-none drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]" aria-hidden>
            {desc.icon}
          </p>
        )}
      </div>
      {now && (
        <dl className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
          {[
            [t(lang, "feels_like"), `${fmtNum(lang, now.feels)}°`],
            [t(lang, "humidity"), `${fmtNum(lang, now.humidity)}%`],
            [t(lang, "wind"), `${fmtNum(lang, now.wind)} ${lang === "bn" ? "কিমি/ঘ" : "km/h"}`],
            [t(lang, "rain_today"), now.rainChance !== null ? `${fmtNum(lang, now.rainChance)}%` : "–"],
          ].map(([k, v]) => (
            <div key={k} className="hero-tile px-1 py-2">
              <dt className="opacity-85">{k}</dt>
              <dd className="num mt-0.5 text-sm font-bold">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {days.length > 0 && (
        <ol className="mt-4 grid grid-cols-7 gap-1 text-center text-xs">
          {days.map((day) => {
            const dd = describeCode(day.weather_code ?? 0);
            return (
              <li key={day.date} className="hero-tile py-1.5">
                <p className="font-semibold opacity-90">{dayName(lang, day.date)}</p>
                <p className="my-0.5 text-lg" aria-hidden>
                  {dd.icon}
                </p>
                <p className="num font-bold">{day.tmax !== null ? `${fmtNum(lang, day.tmax)}°` : "–"}</p>
                <p className="num opacity-80">💧{fmtNum(lang, day.precip_prob ?? 0)}%</p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
