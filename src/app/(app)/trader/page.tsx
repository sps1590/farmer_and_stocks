import { requireDevice } from "@/lib/device";
import { COMMODITIES, UNIT_LABEL } from "@/lib/catalog";
import { t } from "@/lib/i18n";
import { currentPrices, latestForecasts, outlookFrom, referencePrice } from "@/lib/queries";
import type { PriceOutlook } from "@/lib/recommend";
import { ForecastCard, isVerified } from "@/components/ForecastCard";
import { TraderBoard, type BoardItem } from "@/components/TraderBoard";

export default async function TraderPage() {
  const device = await requireDevice();
  const lang = device.lang;
  const [forecasts, prices] = await Promise.all([latestForecasts(), currentPrices(device.district)]);

  const items: BoardItem[] = [];
  for (const c of COMMODITIES) {
    const entry = forecasts.get(c.key);
    const outlooks: Record<number, PriceOutlook> = {};
    for (let m = 1; m <= 6; m++) {
      const o = outlookFrom(entry, m);
      if (o) outlooks[m] = o;
    }
    if (!Object.keys(outlooks).length) continue;
    items.push({
      key: c.key,
      name: lang === "bn" ? c.name_bn : c.name_en,
      icon: c.icon,
      unit: UNIT_LABEL[c.unit][lang],
      buy: referencePrice(c.key, prices.get(c.key)),
      outlooks,
      verified: isVerified(entry?.rows.find((r) => r.horizon === outlooks[3]?.horizon)),
      mine: device.commodities.includes(c.key),
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{t(lang, "trader_title")}</h1>
      </header>

      <TraderBoard items={items} />

      <section>
        <h2 className="mb-3 text-lg font-bold">{t(lang, "forecast_title")}</h2>
        <div className="space-y-3">
          {device.commodities.map((k) => (
            <ForecastCard key={k} lang={lang} commodity={k} entry={forecasts.get(k)} current={prices.get(k)} />
          ))}
        </div>
      </section>
    </div>
  );
}
