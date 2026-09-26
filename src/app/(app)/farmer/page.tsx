import { requireDevice } from "@/lib/device";
import { CROPS, SEASON_LABEL } from "@/lib/catalog";
import { DISTRICT_BY_KEY } from "@/lib/geo";
import { dayName, fmtNum, fmtPct, monthName, t } from "@/lib/i18n";
import { climateNormals, currentPrices, latestForecasts, localReportsToday, outlookFrom, weatherForecast } from "@/lib/queries";
import { suggestCrops } from "@/lib/recommend";
import { bdNow } from "@/lib/time";
import { ForecastCard } from "@/components/ForecastCard";

// WMO weather codes -> icon
function wxIcon(code: number | null, precip: number | null) {
  if (code === null) return (precip ?? 0) >= 1 ? "🌧️" : "⛅";
  if (code >= 95) return "⛈️";
  if (code >= 80) return "🌦️";
  if (code >= 61) return "🌧️";
  if (code >= 51) return "🌦️";
  if (code >= 45) return "🌫️";
  if (code >= 2) return "⛅";
  return "☀️";
}

export default async function FarmerPage() {
  const device = await requireDevice();
  const lang = device.lang;
  const district = DISTRICT_BY_KEY.get(device.district)!;

  const [days, local, normals, forecasts, prices] = await Promise.all([
    weatherForecast(device.district, 7),
    localReportsToday(device.district),
    climateNormals(district.division),
    latestForecasts(),
    currentPrices(device.district),
  ]);

  const nowMonth = bdNow().getUTCMonth() + 1;
  const suggestions = suggestCrops(CROPS, nowMonth, normals, (commodity, ahead) => outlookFrom(forecasts.get(commodity), ahead)).slice(0, 8);
  const districtName = lang === "bn" ? district.name_bn : district.name_en;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted">{districtName}</p>
        <h1 className="text-2xl font-bold">{t(lang, "farmer_title")}</h1>
      </header>

      <section>
        <h2 className="mb-2 text-lg font-bold">{t(lang, "weather_7day")}</h2>
        {days.length ? (
          <div className="card grid grid-cols-7 divide-x divide-border overflow-hidden text-center">
            {days.map((d) => (
              <div key={d.date} className="px-0.5 py-2">
                <p className="text-xs font-semibold text-muted">{dayName(lang, d.date)}</p>
                <p className="my-1 text-xl" aria-hidden>
                  {wxIcon(d.weather_code, d.precip_mm)}
                </p>
                <p className="num text-sm font-bold">{d.tmax !== null ? `${fmtNum(lang, d.tmax)}°` : "–"}</p>
                <p className="num text-xs text-muted">{d.tmin !== null ? `${fmtNum(lang, d.tmin)}°` : "–"}</p>
                <p className="num mt-1 text-[11px] text-primary">💧{fmtNum(lang, d.precip_prob ?? 0)}%</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="card p-4 text-sm text-muted">{t(lang, "no_weather_yet")}</p>
        )}
        {local.n > 0 && (
          <p className="mt-2 text-sm text-muted">
            {t(lang, "local_reports")}: {fmtNum(lang, local.n)} {t(lang, "reports_count")} · 🌧️ {fmtPct(lang, local.rain / local.n)}
            {local.storm > 0 && ` · 🌪️ ${fmtNum(lang, local.storm)}`}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold">{t(lang, "crop_suggestions")}</h2>
        <p className="mb-3 text-sm text-muted">{t(lang, "crop_suggestions_hint")}</p>
        {suggestions.length ? (
          <ol className="space-y-2">
            {suggestions.map((s, i) => (
              <li key={s.crop.key} className="card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      {fmtNum(lang, i + 1)}. {lang === "bn" ? s.crop.name_bn : s.crop.name_en}
                    </p>
                    <p className="text-xs text-muted">
                      {SEASON_LABEL[s.crop.season][lang]} · {t(lang, "plant_in")}: {monthName(lang, s.plantMonth)} → {t(lang, "harvest_in")}: {monthName(lang, s.harvestMonth)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="num text-lg font-bold text-primary">{fmtNum(lang, s.score * 100)}</p>
                    <p className="text-[11px] text-muted">{t(lang, "score")}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="chip num">
                    {t(lang, "climate_fit")} {fmtPct(lang, s.climateFit)}
                  </span>
                  {s.priceChange !== null && (
                    <span className="chip num">
                      {t(lang, "price_at_harvest")} {fmtPct(lang, s.priceChange, true)} ({fmtPct(lang, s.priceLo!, true)}…{fmtPct(lang, s.priceHi!, true)})
                    </span>
                  )}
                </div>
                <ul className="mt-2 space-y-0.5 text-xs text-muted">
                  {s.reasons.map((r) => (
                    <li key={r}>• {t(lang, r as Parameters<typeof t>[1])}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        ) : (
          <p className="card p-4 text-sm text-muted">{t(lang, "no_suggestions")}</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">{t(lang, "your_prices")}</h2>
        <div className="space-y-3">
          {device.commodities.map((k) => (
            <ForecastCard key={k} lang={lang} commodity={k} entry={forecasts.get(k)} current={prices.get(k)} />
          ))}
        </div>
      </section>
    </div>
  );
}
