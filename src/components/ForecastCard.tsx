import { COMMODITY_BY_KEY, UNIT_LABEL } from "@/lib/catalog";
import { fmtPct, fmtTaka, fmtYm, t, type Lang } from "@/lib/i18n";
import { outlookFrom, priceHistory, type CurrentPrice, type ForecastRow } from "@/lib/queries";
import { PriceChart } from "./PriceChart";

const SOURCE_LABEL: Record<string, { en: string; bn: string }> = {
  wfp: { en: "WFP national median", bn: "WFP জাতীয় মধ্যমা" },
  tcb: { en: "TCB Dhaka retail", bn: "টিসিবি ঢাকা খুচরা" },
  crowd: { en: "Community reports", bn: "কমিউনিটির রিপোর্ট" },
};

/** A forecast counts as "verified" once its range was tested on >= 20 unseen months. */
export function isVerified(r: Pick<ForecastRow, "coverage" | "n_test"> | undefined) {
  return Boolean(r && r.coverage !== null && r.n_test >= 20);
}

export async function ForecastCard({
  lang,
  commodity,
  entry,
  current,
}: {
  lang: Lang;
  commodity: string;
  entry: { rows: ForecastRow[]; last: number } | undefined;
  current: CurrentPrice | undefined;
}) {
  const c = COMMODITY_BY_KEY.get(commodity);
  if (!c) return null;
  const name = lang === "bn" ? c.name_bn : c.name_en;
  const unit = UNIT_LABEL[c.unit][lang];

  if (!entry || !entry.rows.length) {
    return (
      <div className="card p-4">
        <p className="font-bold">
          <span aria-hidden>{c.icon}</span> {name}
        </p>
        {current?.tcb && (
          <p className="num mt-1 text-sm">
            {t(lang, "src_tcb")}: {fmtTaka(lang, current.tcb.price)} / {unit}
          </p>
        )}
        <p className="mt-1 text-sm text-muted">{t(lang, "no_forecast")} — {t(lang, "not_enough_yet")}</p>
      </div>
    );
  }

  const first = entry.rows[0];
  const history = await priceHistory(commodity, first.series_source, 24, first.last_month);
  const in3 = outlookFrom(entry, 3);
  const r3 = entry.rows.find((r) => r.horizon === in3?.horizon) ?? entry.rows[Math.min(2, entry.rows.length - 1)];
  const verified = isVerified(r3);
  const change = in3 ? in3.point / in3.last - 1 : null;

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold">
            <span aria-hidden>{c.icon}</span> {name}
          </p>
          <p className="text-xs text-muted">
            {t(lang, "source")}: {SOURCE_LABEL[first.series_source]?.[lang] ?? first.series_source} · {t(lang, "as_of")} {fmtYm(lang, first.last_month)}
          </p>
        </div>
        {in3 && change !== null && (
          <div className="text-right">
            <p className="text-xs text-muted">
              {t(lang, "in_months")} 3 {t(lang, "months")}
            </p>
            <p className={`num text-lg font-bold ${change > 0.03 ? "text-good" : change < -0.03 ? "text-bad" : ""}`}>
              {change > 0.03 ? "▲" : change < -0.03 ? "▼" : "■"} {fmtPct(lang, change, true)}
            </p>
            <p className="num text-xs text-muted">
              {fmtPct(lang, in3.lo / in3.last - 1, true)} … {fmtPct(lang, in3.hi / in3.last - 1, true)}
            </p>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {current?.tcb && (
          <span className="chip num">
            {t(lang, "src_tcb")}: {fmtTaka(lang, current.tcb.price)}/{unit}
          </span>
        )}
        {current?.crowd && (
          <span className="chip num">
            {t(lang, "src_crowd")}: {fmtTaka(lang, current.crowd.price)} ({current.crowd.n})
          </span>
        )}
        {verified ? (
          <span className="chip num" title={t(lang, "verified_coverage")}>
            ✓ {t(lang, "verified_coverage")} {fmtPct(lang, r3.coverage!)} · {t(lang, "typical_error")} {fmtPct(lang, r3.mape ?? 0)}
          </span>
        ) : (
          <span className="chip">⚠ {t(lang, "low_data")}</span>
        )}
      </div>

      <div className="mt-3">
        <PriceChart
          label={`${t(lang, "forecast_title")}: ${name}`}
          history={history}
          forecast={entry.rows.map((r) => ({ m: r.target_month, point: r.point, lo: r.lo, hi: r.hi }))}
        />
      </div>
    </div>
  );
}
