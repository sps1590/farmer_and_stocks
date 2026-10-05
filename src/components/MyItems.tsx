"use client";

import { ChevronRight } from "lucide-react";
import { ItemAvatar, TrendIcon } from "./icons";
import { useState } from "react";
import Link from "next/link";
import { useI18n } from "./I18nProvider";
import { PriceReporter } from "./PriceReporter";
import { Sparkline } from "./Sparkline";
import { fmtPct, fmtTaka } from "@/lib/i18n";
import type { Flag } from "@/lib/recommend";

export type MyItem = {
  key: string;
  name: string;
  icon: string;
  unit: string;
  price: number | null;
  /** Change vs yesterday, vs 7 days ago, and the 3-month forecast change. */
  day: number | null;
  week: number | null;
  outlook: number | null;
  flag: Flag | null;
  spark: number[];
  reference: number;
  source: string;
  reported: Partial<Record<"wholesale" | "retail", number>>;
};

const PERIODS = [
  ["day", "period_day"],
  ["week", "period_week"],
  ["outlook", "period_outlook"],
] as const;
type Period = (typeof PERIODS)[number][0];

const COLLAPSED = 6;

function Delta({ value, label }: { value: number | null; label: string }) {
  const { lang } = useI18n();
  if (value === null) return <span className="text-xs text-muted">–</span>;
  const flat = Math.abs(value) < 0.005;
  const cls = flat ? "flag-orange" : value > 0 ? "flag-green" : "flag-red";
  return (
    <span className={`${cls} num inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold`}>
      <TrendIcon value={value} />
      <span className="sr-only">{label}</span>
      {fmtPct(lang, value, true)}
    </span>
  );
}

/**
 * The user's items as a watchlist. The switch changes which change is shown
 * (today, 7 days, or the 3-month forecast); tapping a row opens the one-tap
 * price report.
 */
export function MyItems({ items }: { items: MyItem[] }) {
  const { t, lang } = useI18n();
  const [period, setPeriod] = useState<Period>("week");
  const [open, setOpen] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, COLLAPSED);

  return (
    <div className="space-y-2">
      <div className="segmented grid-cols-3" role="group" aria-label={t("watchlist")}>
        {PERIODS.map(([p, label]) => (
          <button key={p} type="button" className={`min-h-11 rounded-xl text-sm font-bold ${period === p ? "" : "text-muted"}`} aria-pressed={period === p} onClick={() => setPeriod(p)}>
            {t(label)}
          </button>
        ))}
      </div>

      <ul className="stagger card divide-y divide-border overflow-hidden">
        {shown.map((it) => (
          <li key={it.key}>
            <button type="button" className="row-tap" aria-expanded={open === it.key} onClick={() => setOpen(open === it.key ? null : it.key)}>
              <ItemAvatar icon={it.icon} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{it.name}</span>
                <span className="num block text-xs text-muted">
                  {it.price !== null ? `${fmtTaka(lang, it.price)}/${it.unit}` : "–"}
                  {Object.keys(it.reported).length > 0 && ` · ${t("saved")}`}
                </span>
              </span>
              <Sparkline values={it.spark} width={64} />
              <span className="w-[4.6rem] text-right">
                <Delta value={it[period]} label={t(PERIODS.find(([p]) => p === period)![1])} />
              </span>
            </button>
            {open === it.key && (
              <div className="space-y-2 bg-surface-2 p-3">
                <PriceReporter commodity={it.key} name={it.name} icon={it.icon} unit={it.unit} reference={it.reference} source={it.source} reported={it.reported} />
                <Link href={`/market/${it.key}`} className="block text-center text-sm font-semibold text-primary">
                  {t("details")} <ChevronRight className="inline size-4" aria-hidden />
                </Link>
              </div>
            )}
          </li>
        ))}
      </ul>

      {items.length > COLLAPSED && (
        <button type="button" className="tap w-full text-sm" onClick={() => setAll((v) => !v)}>
          {all ? t("show_less") : `${t("show_all")} (${items.length})`}
        </button>
      )}
    </div>
  );
}
