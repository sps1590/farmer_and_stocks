import { CalendarDays, CloudRain, LineChart, MapPin, Thermometer } from "lucide-react";
import { requireDevice } from "@/lib/device";
import { SEASON_LABEL } from "@/lib/catalog";
import { DISTRICT_BY_KEY } from "@/lib/geo";
import { placeLabel } from "@/lib/admin-geo";
import { fmtNum, fmtPct, monthName, t, type DictKey } from "@/lib/i18n";
import { currentPrices, latestForecasts, monthVsHistory } from "@/lib/queries";
import { cropPlan, type CropPlanItem } from "@/lib/market";
import { FLAG_ORDER, planWindow } from "@/lib/recommend";
import { ForecastCard } from "@/components/ForecastCard";
import { FlagLegend, FlagPill } from "@/components/Flag";

const WINDOWS = [
  ["now", "plan_now"],
  ["soon", "plan_soon"],
  ["later", "plan_later"],
] as const;

export default async function GrowPage() {
  const device = await requireDevice();
  const lang = device.lang;
  const district = DISTRICT_BY_KEY.get(device.district)!;
  const [plan, history, forecasts, prices] = await Promise.all([
    cropPlan(device.district),
    monthVsHistory(device.district),
    latestForecasts(),
    currentPrices(device.district),
  ]);

  const byWindow = (w: string) =>
    // Profit, then loss, then stable; best score first within each group.
    plan.filter((p) => planWindow(p.monthsToPlant) === w).sort((a, b) => FLAG_ORDER[a.flag] - FLAG_ORDER[b.flag] || b.score - a.score);
  const place = placeLabel(device, lang === "bn" ? district.name_bn : district.name_en, lang);

  return (
    <div className="space-y-6">
      <header>
        <p className="flex items-center gap-1 text-sm text-muted">
          <MapPin className="size-4 shrink-0" aria-hidden /> {place}
        </p>
        <h1 className="text-3xl font-bold">
          <span className="text-gradient">{t(lang, "grow_title")}</span>
        </h1>
        <p className="text-sm text-muted">{t(lang, "grow_hint")}</p>
      </header>

      {history && (
        <section className="card p-4">
          <h2 className="section-title mb-3">
            <CalendarDays className="size-5 text-primary" aria-hidden /> {t(lang, "weather_5y")}
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-surface-2 p-3">
              <p className="flex items-center gap-1 text-xs text-muted">
                <CloudRain className="size-4" aria-hidden /> {t(lang, "rain_so_far")}
              </p>
              <p className="num text-2xl font-extrabold">{fmtNum(lang, history.rainNow)} mm</p>
              <p className="num text-xs text-muted">
                {t(lang, "avg_label")}: {fmtNum(lang, history.rainAvg)} mm ({fmtPct(lang, history.rainAvg ? history.rainNow / history.rainAvg - 1 : 0, true)})
              </p>
            </div>
            <div className="rounded-xl bg-surface-2 p-3">
              <p className="flex items-center gap-1 text-xs text-muted">
                <Thermometer className="size-4" aria-hidden /> {t(lang, "max_temp")}
              </p>
              <p className="num text-2xl font-extrabold">{fmtNum(lang, history.tmaxNow, 1)}°</p>
              <p className="num text-xs text-muted">
                {t(lang, "avg_label")}: {fmtNum(lang, history.tmaxAvg, 1)}° ({history.tmaxNow >= history.tmaxAvg ? "+" : ""}
                {fmtNum(lang, history.tmaxNow - history.tmaxAvg, 1)}°)
              </p>
            </div>
          </div>
        </section>
      )}

      <FlagLegend lang={lang} />

      {WINDOWS.map(([w, label]) => {
        const items = byWindow(w);
        if (!items.length) return null;
        return (
          <section key={w}>
            <h2 className="section-title mb-2">{t(lang, label)}</h2>
            <ul className="stagger grid gap-2">
              {items.map((p) => (
                <CropCard key={p.crop.key} p={p} lang={lang} />
              ))}
            </ul>
          </section>
        );
      })}

      <section>
        <h2 className="section-title mb-3">
          <LineChart className="size-5 text-primary" aria-hidden /> {t(lang, "your_prices")}
        </h2>
        <div className="space-y-3">
          {device.commodities.map((k) => (
            <ForecastCard key={k} lang={lang} commodity={k} entry={forecasts.get(k)} current={prices.get(k)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function CropCard({ p, lang }: { p: CropPlanItem; lang: "en" | "bn" }) {
  return (
    <li className={`card flag-bar-${p.flag} p-3 pl-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-bold">{lang === "bn" ? p.crop.name_bn : p.crop.name_en}</p>
          <p className="text-xs text-muted">
            {SEASON_LABEL[p.crop.season][lang]} · {t(lang, "plant_in")} {monthName(lang, p.plantMonth)} · {t(lang, "harvest_in")}{" "}
            {monthName(lang, p.harvestMonth)}
          </p>
        </div>
        <FlagPill flag={p.flag} lang={lang} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted">{t(lang, "climate_fit")}</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2" role="meter" aria-valuenow={Math.round(p.climateFit * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="meter-fill h-full rounded-full bg-primary" style={{ width: `${Math.round(p.climateFit * 100)}%` }} />
          </div>
          <p className="num mt-0.5 font-bold">{fmtPct(lang, p.climateFit)}</p>
        </div>
        <div>
          <p className="text-muted">{t(lang, "price_at_harvest")}</p>
          <p className="num mt-1 text-sm font-bold">
            {p.priceChange !== null ? fmtPct(lang, p.priceChange, true) : "–"}
            {p.priceLo !== null && p.priceHi !== null && (
              <span className="font-normal text-muted">
                {" "}
                ({fmtPct(lang, p.priceLo, true)}…{fmtPct(lang, p.priceHi, true)})
              </span>
            )}
          </p>
        </div>
      </div>
      <details className="mt-2 text-xs text-muted">
        <summary className="cursor-pointer">{t(lang, "details")}</summary>
        <ul className="mt-1 space-y-0.5">
          {p.reasons.map((r) => (
            <li key={r}>• {t(lang, r as DictKey)}</li>
          ))}
        </ul>
      </details>
    </li>
  );
}
