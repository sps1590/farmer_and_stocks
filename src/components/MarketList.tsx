"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "./I18nProvider";
import { FlagPill } from "./Flag";
import { fmtPct, fmtTaka } from "@/lib/i18n";
import { compareFlagged, type Flag } from "@/lib/recommend";

export type MarketItem = {
  key: string;
  name: string;
  icon: string;
  unit: string;
  price: number | null;
  change: number | null;
  lo: number | null;
  hi: number | null;
  flag: Flag | null;
  verified: boolean;
  mine: boolean;
};

const FILTERS = ["all", "green", "red", "orange"] as const;

export function MarketList({ items }: { items: MarketItem[] }) {
  const { t, lang } = useI18n();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const shown = items
    .filter((i) => filter === "all" || i.flag === filter)
    .sort((a, b) => compareFlagged({ flag: a.flag, value: a.change }, { flag: b.flag, value: b.change }));

  const count = (f: (typeof FILTERS)[number]) => (f === "all" ? items.length : items.filter((i) => i.flag === f).length);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1" role="group">
        {FILTERS.map((f) => (
          <button key={f} type="button" className="tap min-h-10 shrink-0 px-3 text-sm" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === "all" ? t("filter_all") : f === "green" ? `▲ ${t("flag_green")}` : f === "orange" ? `■ ${t("flag_orange")}` : `▼ ${t("flag_red")}`}
            <span className="num text-xs text-muted">{count(f)}</span>
          </button>
        ))}
      </div>
      <ul className="card divide-y divide-border overflow-hidden">
        {shown.map((i) => (
          <li key={i.key} className={i.flag ? `flag-bar-${i.flag}` : ""}>
            <Link href={`/market/${i.key}`} className="row-tap">
              <span className="text-2xl" aria-hidden>
                {i.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">
                  {i.name} {i.mine && <span className="text-xs text-primary">★</span>}
                </span>
                <span className="num block text-xs text-muted">
                  {i.change !== null
                    ? `${t("outlook_3m")}: ${fmtPct(lang, i.change, true)}${i.lo !== null && i.hi !== null ? ` (${fmtPct(lang, i.lo, true)}…${fmtPct(lang, i.hi, true)})` : ""}${i.verified ? "" : " ⚠"}`
                    : t("no_forecast")}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <span className="num font-extrabold">
                  {i.price !== null ? fmtTaka(lang, i.price) : "–"}
                  <span className="text-xs font-normal text-muted">/{i.unit}</span>
                </span>
                {i.flag && <FlagPill flag={i.flag} lang={lang} />}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
