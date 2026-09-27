import Link from "next/link";
import { requireDevice } from "@/lib/device";
import { UNIT_LABEL } from "@/lib/catalog";
import { fmtNum, t, type DictKey } from "@/lib/i18n";
import { latestForecasts, outlookFrom, referencePrice } from "@/lib/queries";
import { marketRows } from "@/lib/market";
import { dailyBoard, dailySeries, productStats } from "@/lib/daily";
import { refreshStatus } from "@/lib/refresh";
import type { PriceOutlook } from "@/lib/recommend";
import { FlagLegend } from "@/components/Flag";
import { MarketList, type MarketItem } from "@/components/MarketList";
import { TraderBoard, type BoardItem } from "@/components/TraderBoard";
import { DailyPrices } from "@/components/DailyPrices";
import { UpdatePricesButton } from "@/components/UpdatePricesButton";

// The "Update today's price" button runs its scrape in after(), which is
// bounded by this segment's max duration.
export const maxDuration = 300;

const VIEWS = [
  ["today", "tab_today_prices"],
  ["outlook", "tab_outlook"],
  ["stock", "stock_planner"],
] as const;

export default async function MarketPage({ searchParams }: PageProps<"/trader">) {
  const device = await requireDevice();
  const lang = device.lang;
  const sp = await searchParams;
  const view = VIEWS.some(([v]) => v === sp.view) ? (sp.view as (typeof VIEWS)[number][0]) : "today";

  const [status, board, stats, rows, forecasts, spark] = await Promise.all([
    refreshStatus(),
    dailyBoard(),
    productStats(),
    marketRows(device.district),
    latestForecasts(),
    dailySeries(30),
  ]);

  const items: MarketItem[] = rows.map((r) => ({
    key: r.c.key,
    name: lang === "bn" ? r.c.name_bn : r.c.name_en,
    icon: r.c.icon,
    unit: UNIT_LABEL[r.c.unit][lang],
    price: r.price,
    change: r.change,
    lo: r.outlook ? r.outlook.lo / r.outlook.last - 1 : null,
    hi: r.outlook ? r.outlook.hi / r.outlook.last - 1 : null,
    flag: r.flag,
    verified: r.verified,
    mine: device.commodities.includes(r.c.key),
  }));

  const planner: BoardItem[] = [];
  for (const r of rows) {
    const outlooks: Record<number, PriceOutlook> = {};
    for (let m = 1; m <= 6; m++) {
      const o = outlookFrom(forecasts.get(r.c.key), m);
      if (o) outlooks[m] = o;
    }
    if (!Object.keys(outlooks).length) continue;
    planner.push({
      key: r.c.key,
      name: lang === "bn" ? r.c.name_bn : r.c.name_en,
      icon: r.c.icon,
      unit: UNIT_LABEL[r.c.unit][lang],
      buy: referencePrice(r.c.key, r.prices),
      outlooks,
      verified: r.verified,
      mine: device.commodities.includes(r.c.key),
    });
  }

  return (
    <div className="space-y-5">
      <header className="rise">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Krishi Bazar · AI</p>
        <h1 className="text-3xl font-bold">
          <span className="text-gradient">{t(lang, "market_title")}</span>
        </h1>
        <p className="mt-1 text-xs text-muted">ⓘ {t(lang, "no_discount_note")}</p>
      </header>

      <UpdatePricesButton initial={status} />

      <nav className="segmented grid-cols-3" aria-label={t(lang, "market_title")}>
        {VIEWS.map(([v, label]) => (
          <Link
            key={v}
            href={v === "today" ? "/trader" : `/trader?view=${v}`}
            aria-current={view === v ? "page" : undefined}
            className={`rounded-xl px-2 py-2.5 text-center text-sm font-bold ${view === v ? "" : "text-muted"}`}
          >
            {t(lang, label as DictKey)}
          </Link>
        ))}
      </nav>

      {view === "today" && (
        <section className="space-y-2">
          <DailyPrices lang={lang} board={board} mine={device.commodities} spark={spark} />
          {stats.products > 0 && (
            <p className="num text-center text-xs text-muted">
              {t(lang, "products_tracked")}: {fmtNum(lang, stats.products)} · {fmtNum(lang, stats.days)} {t(lang, "days_count")}
            </p>
          )}
        </section>
      )}

      {view === "outlook" && (
        <section className="space-y-3">
          <p className="text-sm text-muted">{t(lang, "market_hint")}</p>
          <FlagLegend lang={lang} />
          <MarketList items={items} />
        </section>
      )}

      {view === "stock" && <TraderBoard items={planner} />}
    </div>
  );
}
