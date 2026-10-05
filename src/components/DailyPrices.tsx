import { Star } from "lucide-react";
import { TrendIcon } from "./icons";
import Link from "next/link";
import { COMMODITIES, UNIT_LABEL } from "@/lib/catalog";
import { fmtPct, fmtTaka, t, type Lang } from "@/lib/i18n";
import type { DailyRow } from "@/lib/daily";
import { compareFlagged, type Flag } from "@/lib/recommend";
import { Sparkline } from "./Sparkline";

export function Change({ value, lang }: { value: number | null; lang: Lang }) {
  if (value === null) return <span className="text-muted">–</span>;
  const flat = Math.abs(value) < 0.005;
  const cls = flat ? "text-muted" : value > 0 ? "text-flag-green" : "text-flag-red";
  return (
    <span className={`num inline-flex items-center gap-0.5 font-bold ${cls}`}>
      <TrendIcon value={value} /> {fmtPct(lang, value, true)}
    </span>
  );
}

/** Today's price per commodity with day-on-day and week-on-week change. */
export function DailyPrices({ lang, board, mine, spark }: { lang: Lang; board: Map<string, DailyRow>; mine: string[]; spark?: Map<string, number[]> }) {
  const rows = COMMODITIES.map((c) => ({ c, d: board.get(c.key) })).filter((r) => r.d?.price != null);
  if (!rows.length) return <p className="card p-4 text-sm text-muted">{t(lang, "no_daily_yet")}</p>;
  // Rising (profit) first, then falling (loss), then unchanged — by the latest
  // move: yesterday's change when there is one, else the 7-day change.
  const move = (d: DailyRow) => (d.dayChange !== null && Math.abs(d.dayChange) >= 0.005 ? d.dayChange : d.weekChange);
  const dir = (v: number | null): Flag | null => (v === null ? null : v >= 0.005 ? "green" : v <= -0.005 ? "red" : "orange");
  rows.sort((a, b) => compareFlagged({ flag: dir(move(a.d!)), value: move(a.d!) }, { flag: dir(move(b.d!)), value: move(b.d!) }));

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_4.75rem_4.25rem_4.25rem] gap-2 bg-surface-2 px-3 py-2 text-xs font-semibold text-muted">
        <span>{t(lang, "commodity")}</span>
        <span className="text-right">{t(lang, "avg_price")}</span>
        <span className="text-right">{t(lang, "day_change")}</span>
        <span className="text-right">{t(lang, "week_change")}</span>
      </div>
      <ul className="divide-y divide-border">
        {rows.map(({ c, d }) => (
          <li key={c.key}>
            <Link href={`/market/${c.key}`} className="grid min-h-14 grid-cols-[minmax(0,1fr)_4.75rem_4.25rem_4.25rem] items-center gap-2 px-3 py-2.5 text-sm hover:bg-surface-2">
              <span className="min-w-0 font-semibold leading-tight">
                <span aria-hidden>{c.icon}</span> {lang === "bn" ? c.name_bn : c.name_en}
                {mine.includes(c.key) && <Star className="ml-1 inline size-3 fill-current text-primary" aria-hidden />}
                {spark?.get(c.key) && (
                  <span className="mt-1 block">
                    <Sparkline values={spark.get(c.key)!} />
                  </span>
                )}
              </span>
              <span className="num text-right font-bold">
                {fmtTaka(lang, d!.price!)}
                <span className="block text-xs font-normal text-muted">/{UNIT_LABEL[c.unit][lang]}</span>
              </span>
              <span className="text-right text-xs">
                <Change value={d!.dayChange} lang={lang} />
              </span>
              <span className="text-right text-xs">
                <Change value={d!.weekChange} lang={lang} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
