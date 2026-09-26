import { requireDevice } from "@/lib/device";
import { UNIT_LABEL } from "@/lib/catalog";
import { t } from "@/lib/i18n";
import { latestForecasts, outlookFrom, referencePrice } from "@/lib/queries";
import { marketRows } from "@/lib/market";
import type { PriceOutlook } from "@/lib/recommend";
import { FlagLegend } from "@/components/Flag";
import { MarketList, type MarketItem } from "@/components/MarketList";
import { TraderBoard, type BoardItem } from "@/components/TraderBoard";

export default async function MarketPage() {
  const device = await requireDevice();
  const lang = device.lang;
  const [rows, forecasts] = await Promise.all([marketRows(device.district), latestForecasts()]);

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

  const board: BoardItem[] = [];
  for (const r of rows) {
    const outlooks: Record<number, PriceOutlook> = {};
    for (let m = 1; m <= 6; m++) {
      const o = outlookFrom(forecasts.get(r.c.key), m);
      if (o) outlooks[m] = o;
    }
    if (!Object.keys(outlooks).length) continue;
    board.push({
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
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">📈 {t(lang, "market_title")}</h1>
        <p className="text-sm text-muted">{t(lang, "market_hint")}</p>
        <p className="mt-1 text-xs text-muted">ⓘ {t(lang, "no_discount_note")}</p>
      </header>
      <FlagLegend lang={lang} />
      <MarketList items={items} />
      {device.role !== "farmer" && (
        <section>
          <h2 className="section-title mb-2">📦 {t(lang, "stock_planner")}</h2>
          <TraderBoard items={board} />
        </section>
      )}
    </div>
  );
}
