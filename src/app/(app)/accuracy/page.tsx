import { requireDevice } from "@/lib/device";
import { COMMODITY_BY_KEY } from "@/lib/catalog";
import { fmtNum, fmtPct, t } from "@/lib/i18n";
import { communityStats, latestForecasts, sourceStatus, weatherAccuracy } from "@/lib/queries";

const SHOW_H = [1, 3, 6];

export default async function AccuracyPage() {
  const device = await requireDevice();
  const lang = device.lang;
  const [forecasts, weather, sources, community] = await Promise.all([latestForecasts(), weatherAccuracy(), sourceStatus(), communityStats()]);

  const rows = [...forecasts.entries()]
    .map(([key, e]) => ({ key, c: COMMODITY_BY_KEY.get(key), e }))
    .filter((r) => r.c)
    .sort((a, b) => (b.e.rows[0]?.n_points ?? 0) - (a.e.rows[0]?.n_points ?? 0));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{t(lang, "accuracy_title")}</h1>
        <p className="mt-1 text-sm text-muted">{t(lang, "accuracy_intro")}</p>
        <p className="chip mt-2">🎯 {t(lang, "accuracy_target")}</p>
      </header>

      <section>
        <h2 className="mb-2 text-lg font-bold">{t(lang, "price_accuracy")}</h2>
        {rows.length ? (
          <div className="card overflow-x-auto">
            <table className="num w-full text-sm">
              <thead className="bg-surface-2 text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">{t(lang, "commodity")}</th>
                  {SHOW_H.map((h) => (
                    <th key={h} className="px-2 py-2 text-right font-semibold">
                      {fmtNum(lang, h)} {t(lang, h === 1 ? "month" : "months")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ key, c, e }) => (
                  <tr key={key} className="border-t border-border align-top">
                    <td className="px-3 py-2">
                      <span className="font-semibold">
                        {c!.icon} {lang === "bn" ? c!.name_bn : c!.name_en}
                      </span>
                      <span className="block text-[11px] text-muted">
                        {e.rows[0].model} · {fmtNum(lang, e.rows[0].n_points)} {t(lang, "months")}
                      </span>
                    </td>
                    {SHOW_H.map((h) => {
                      const r = e.rows.find((x) => x.horizon === h);
                      if (!r || r.coverage === null || r.n_test === 0) {
                        return (
                          <td key={h} className="px-2 py-2 text-right text-xs text-muted">
                            –
                          </td>
                        );
                      }
                      const ok = r.coverage >= 0.95;
                      const reliable = r.n_test >= 20;
                      return (
                        <td key={h} className="px-2 py-2 text-right">
                          <span className={`font-bold ${!reliable ? "text-muted" : ok ? "text-good" : "text-warn"}`}>
                            {reliable ? (ok ? "✓ " : "⚠ ") : ""}
                            {fmtNum(lang, r.coverage * 100, 1)}%
                          </span>
                          <span className="block text-[11px] text-muted">
                            {t(lang, "mape")} {fmtPct(lang, r.mape ?? 0)}
                          </span>
                          <span className="block text-[11px] text-muted">
                            {fmtNum(lang, r.n_test)} {t(lang, "tested_on")}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-border px-3 py-2 text-[11px] text-muted">
              {t(lang, "coverage")} = {t(lang, "verified_coverage")} · {t(lang, "low_data")}: &lt; {fmtNum(lang, 20)} {t(lang, "tested_on")}
            </p>
          </div>
        ) : (
          <p className="card p-4 text-sm text-muted">{t(lang, "not_enough_yet")}</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">{t(lang, "weather_accuracy")}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-3">
            <p className="text-xs text-muted">{t(lang, "next_day_rain")}</p>
            <p className="num text-2xl font-bold">{weather.forecast.n && weather.forecast.rain_hit !== null ? fmtPct(lang, weather.forecast.rain_hit) : "–"}</p>
            <p className="num text-[11px] text-muted">n = {fmtNum(lang, weather.forecast.n)}</p>
          </div>
          <div className="card p-3">
            <p className="text-xs text-muted">{t(lang, "tmax_error")}</p>
            <p className="num text-2xl font-bold">{weather.forecast.tmax_mae !== null ? `±${fmtNum(lang, weather.forecast.tmax_mae, 1)}°C` : "–"}</p>
          </div>
          <div className="card col-span-2 p-3">
            <p className="text-xs text-muted">{t(lang, "crowd_agreement")}</p>
            <p className="num text-2xl font-bold">{weather.crowd.n && weather.crowd.agree !== null ? fmtPct(lang, weather.crowd.agree) : "–"}</p>
            <p className="num text-[11px] text-muted">n = {fmtNum(lang, weather.crowd.n)}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">{t(lang, "data_sources")}</h2>
        <ul className="card divide-y divide-border text-sm">
          {sources.map((s) => (
            <li key={s.source} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="font-semibold">{s.source}</span>
              <span className="text-right text-xs text-muted">
                <span className={s.ok ? "text-good" : "text-bad"}>{s.ok ? `✓ ${t(lang, "status_ok")}` : `✕ ${t(lang, "status_failed")}`}</span>
                <span className="block">
                  {t(lang, "last_update")}: {new Date(s.started_at).toLocaleString(lang === "bn" ? "bn-BD" : "en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" })}
                </span>
                {s.message && <span className="block max-w-56 truncate text-[10px]" title={s.message}>{s.message}</span>}
              </span>
            </li>
          ))}
          {!sources.length && <li className="px-3 py-2 text-muted">{t(lang, "not_enough_yet")}</li>}
        </ul>
        <p className="mt-3 text-sm text-muted">
          {t(lang, "community")}: {fmtNum(lang, community.devices)} {t(lang, "devices")} · {fmtNum(lang, community.weather)} {t(lang, "weather_reports")} · {fmtNum(lang, community.prices)} {t(lang, "price_reports")}
        </p>
      </section>
    </div>
  );
}
