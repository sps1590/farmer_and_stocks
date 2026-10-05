"use client";

import { TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { compareFlagged, computeMargin, marginFlag, type PriceOutlook } from "@/lib/recommend";
import { FlagPill } from "./Flag";
import { fmtNum, fmtPct, fmtTaka } from "@/lib/i18n";
import { useI18n } from "./I18nProvider";
import { useTween } from "./useTween";

export type BoardItem = {
  key: string;
  name: string;
  icon: string;
  unit: string;
  buy: number;
  outlooks: Record<number, PriceOutlook>;
  verified: boolean;
  mine: boolean;
};

function Stepper({ label, value, set, min, max, step, fmt }: { label: string; value: number; set: (v: number) => void; min: number; max: number; step: number; fmt: (v: number) => string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <div className="flex shrink-0 items-center gap-1.5">
        <button type="button" className="tap h-10 w-10 p-0 text-xl" aria-label={`${label} −`} onClick={() => set(Math.max(min, +(value - step).toFixed(2)))}>
          −
        </button>
        <span className="num w-24 text-center font-bold">{fmt(value)}</span>
        <button type="button" className="tap h-10 w-10 p-0 text-xl" aria-label={`${label} +`} onClick={() => set(Math.min(max, +(value + step).toFixed(2)))}>
          +
        </button>
      </div>
    </div>
  );
}

function Tween({ value, signed = false }: { value: number; signed?: boolean }) {
  const { lang } = useI18n();
  return <>{fmtPct(lang, useTween(value), signed)}</>;
}

export function TraderBoard({ items }: { items: BoardItem[] }) {
  const { t, lang } = useI18n();
  const [hold, setHold] = useState(3);
  const [storage, setStorage] = useState(1.5);
  const [loss, setLoss] = useState(2);
  const [selected, setSelected] = useState<string | null>(items.find((i) => i.mine)?.key ?? items[0]?.key ?? null);
  const [buyAdj, setBuyAdj] = useState<Record<string, number>>({});

  const ranked = useMemo(
    () =>
      items
        .map((it) => {
          const o = it.outlooks[hold];
          if (!o) return null;
          const buy = buyAdj[it.key] ?? it.buy;
          return { it, buy, m: computeMargin({ buyPrice: buy, holdMonths: hold, storagePctPerMonth: storage, lossPct: loss, outlook: o }) };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        // Profit, then loss, then stable.
        .sort((a, b) => compareFlagged({ flag: marginFlag(a.m), value: a.m.marginPct }, { flag: marginFlag(b.m), value: b.m.marginPct })),
    [items, hold, storage, loss, buyAdj],
  );

  const sel = ranked.find((r) => r.it.key === selected) ?? ranked[0];

  if (!items.length) {
    return <p className="card p-4 text-sm text-muted">{t("no_forecast")} — {t("not_enough_yet")}</p>;
  }

  const monthsLabel = (v: number) => `${fmtNum(lang, v)} ${v === 1 ? t("month") : t("months")}`;

  return (
    <section className="space-y-3">
      <p className="text-sm text-muted">{t("stock_now_hint")}</p>

      <div className="card space-y-2 p-3">
        <Stepper label={t("hold_months")} value={hold} set={setHold} min={1} max={6} step={1} fmt={monthsLabel} />
        <Stepper label={t("storage_cost")} value={storage} set={setStorage} min={0} max={10} step={0.5} fmt={(v) => `${fmtNum(lang, v, 1)}%`} />
        <Stepper label={t("loss_pct")} value={loss} set={setLoss} min={0} max={30} step={1} fmt={(v) => `${fmtNum(lang, v)}%`} />
      </div>

      {sel && (
        <div className="card p-4">
          <p className="font-bold">
            <span aria-hidden>{sel.it.icon}</span> {sel.it.name} <FlagPill flag={marginFlag(sel.m)} lang={lang} />
            {!sel.it.verified && (
              <span className="chip ml-2">
                <TriangleAlert className="size-3.5" aria-hidden /> {t("low_data")}
              </span>
            )}
          </p>
          <div className="mt-3">
            <p className="text-xs font-semibold text-muted">
              {t("buy_price")} ({t("per")} {sel.it.unit})
            </p>
            <input
              type="range"
              className="slider"
              min={Math.round(sel.it.buy * 0.5)}
              max={Math.round(sel.it.buy * 1.5)}
              step={sel.it.buy < 50 ? 0.5 : 1}
              value={sel.buy}
              aria-label={t("buy_price")}
              onChange={(e) => setBuyAdj((b) => ({ ...b, [sel.it.key]: Number(e.target.value) }))}
            />
            <p className="num text-center text-2xl font-bold">{fmtTaka(lang, sel.buy)}</p>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">{t("expected_sell")}</dt>
              <dd className="num font-bold">{fmtTaka(lang, sel.m.expectedSell)}</dd>
              <dd className="num text-xs text-muted">
                {fmtTaka(lang, sel.m.sellLo)}–{fmtTaka(lang, sel.m.sellHi)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t("break_even")}</dt>
              <dd className="num font-bold">{fmtTaka(lang, sel.m.breakEven)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t("expected_margin")}</dt>
              <dd className={`num text-xl font-bold ${sel.m.marginPct >= 0 ? "text-good" : "text-bad"}`}><Tween value={sel.m.marginPct} signed /></dd>
              <dd className="num text-xs text-muted">
                {t("margin_range")}: {fmtPct(lang, sel.m.marginLoPct, true)} … {fmtPct(lang, sel.m.marginHiPct, true)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t("prob_profit")}</dt>
              <dd className="num text-xl font-bold"><Tween value={sel.m.probProfit} /></dd>
            </div>
          </dl>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs text-muted">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">{t("commodity")}</th>
              <th className="px-2 py-2 text-right font-semibold">{t("expected_margin")}</th>
              <th className="px-3 py-2 text-right font-semibold">{t("prob_profit")}</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map(({ it, m }) => (
              <tr
                key={it.key}
                className={`cursor-pointer border-t border-border ${sel?.it.key === it.key ? "bg-primary-soft" : ""}`}
                onClick={() => setSelected(it.key)}
              >
                <td className="px-3 py-2.5">
                  <button type="button" className="text-left font-semibold" onClick={() => setSelected(it.key)}>
                    <span aria-hidden>{it.icon}</span> {it.name}
                    {!it.verified && <TriangleAlert className="ml-1 inline size-3.5 text-muted" aria-label={t("low_data")} />}
                  </button>
                  <span className="mt-1 block">
                    <FlagPill flag={marginFlag(m)} lang={lang} />
                  </span>
                </td>
                <td className={`num px-2 text-right font-bold ${m.marginPct >= 0 ? "text-good" : "text-bad"}`}>
                  {fmtPct(lang, m.marginPct, true)}
                  <span className="block text-xs font-normal text-muted">
                    {fmtPct(lang, m.marginLoPct, true)}…{fmtPct(lang, m.marginHiPct, true)}
                  </span>
                </td>
                <td className="num px-3 text-right">{fmtPct(lang, m.probProfit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
