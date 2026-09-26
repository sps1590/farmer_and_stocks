import Link from "next/link";
import { COMMODITIES, UNIT_LABEL } from "@/lib/catalog";
import { fmtPct, fmtTaka, t, type Lang } from "@/lib/i18n";
import type { DailyRow } from "@/lib/daily";

export function Change({ value, lang }: { value: number | null; lang: Lang }) {
  if (value === null) return <span className="text-muted">–</span>;
  const flat = Math.abs(value) < 0.005;
  const cls = flat ? "text-muted" : value > 0 ? "text-flag-green" : "text-flag-red";
  return (
    <span className={`num font-bold ${cls}`}>
      <span aria-hidden>{flat ? "■" : value > 0 ? "▲" : "▼"}</span> {fmtPct(lang, value, true)}
    </span>
  );
}

/** Today's price per commodity with day-on-day and week-on-week change. */
export function DailyPrices({ lang, board, mine }: { lang: Lang; board: Map<string, DailyRow>; mine: string[] }) {
  const rows = COMMODITIES.map((c) => ({ c, d: board.get(c.key) })).filter((r) => r.d?.price != null);
  if (!rows.length) return <p className="card p-4 text-sm text-muted">{t(lang, "no_daily_yet")}</p>;
  rows.sort((a, b) => Number(mine.includes(b.c.key)) - Number(mine.includes(a.c.key)) || Math.abs(b.d!.dayChange ?? 0) - Math.abs(a.d!.dayChange ?? 0));

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_4.75rem_4.25rem_4.25rem] gap-2 bg-surface-2 px-3 py-2 text-[11px] font-semibold text-muted">
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
                {mine.includes(c.key) && <span className="text-xs text-primary"> ★</span>}
              </span>
              <span className="num text-right font-bold">
                {fmtTaka(lang, d!.price!)}
                <span className="block text-[10px] font-normal text-muted">/{UNIT_LABEL[c.unit][lang]}</span>
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
