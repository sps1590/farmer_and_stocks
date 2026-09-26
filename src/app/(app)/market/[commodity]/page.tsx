import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDevice } from "@/lib/device";
import { COMMODITY_BY_KEY, UNIT_LABEL } from "@/lib/catalog";
import { fmtPct, fmtTaka, t, type DictKey } from "@/lib/i18n";
import { currentPrices, latestForecasts, outlookFrom, referencePrice } from "@/lib/queries";
import { priceFlag, type PriceOutlook } from "@/lib/recommend";
import { ForecastCard } from "@/components/ForecastCard";
import { FlagPill } from "@/components/Flag";
import { PriceReporter } from "@/components/PriceReporter";
import { TraderBoard } from "@/components/TraderBoard";

export default async function CommodityPage({ params }: PageProps<"/market/[commodity]">) {
  const { commodity } = await params;
  const c = COMMODITY_BY_KEY.get(commodity);
  if (!c) notFound();
  const device = await requireDevice();
  const lang = device.lang;
  const [prices, forecasts] = await Promise.all([currentPrices(device.district), latestForecasts()]);
  const cp = prices.get(commodity);
  const entry = forecasts.get(commodity);
  const o3 = outlookFrom(entry, 3);
  const unit = UNIT_LABEL[c.unit][lang];
  const name = lang === "bn" ? c.name_bn : c.name_en;

  const sources: { key: DictKey; price: number | null; note?: string }[] = [
    { key: "src_tcb", price: cp?.tcb?.price ?? null, note: cp?.tcb?.date },
    { key: "src_chaldal", price: cp?.chaldal?.price ?? null, note: cp?.chaldal?.date },
    { key: "src_shwapno", price: cp?.shwapno?.price ?? null, note: cp?.shwapno?.date },
    { key: "src_crowd", price: cp?.crowd?.price ?? null, note: cp?.crowd ? `n=${cp.crowd.n}` : undefined },
    { key: "src_wfp", price: cp?.wfp?.price ?? null, note: cp?.wfp?.month },
  ];

  const outlooks: Record<number, PriceOutlook> = {};
  for (let m = 1; m <= 6; m++) {
    const o = outlookFrom(entry, m);
    if (o) outlooks[m] = o;
  }

  return (
    <div className="space-y-5">
      <Link href="/trader" className="text-sm font-semibold text-primary">
        ← {t(lang, "market_title")}
      </Link>

      <header className="card flex items-center gap-4 p-4">
        <span className="text-5xl" aria-hidden>
          {c.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold">{name}</h1>
          <p className="num text-3xl font-extrabold">
            {cp?.avg ? fmtTaka(lang, cp.avg.price) : "–"}
            <span className="text-sm font-normal text-muted"> / {unit}</span>
          </p>
          <p className="text-xs text-muted">{t(lang, "no_discount_note")}</p>
        </div>
        {o3 && (
          <div className="text-right">
            <FlagPill flag={priceFlag(o3)} lang={lang} />
            <p className="num mt-1 text-sm font-bold">{fmtPct(lang, o3.point / o3.last - 1, true)}</p>
            <p className="text-[11px] text-muted">{t(lang, "outlook_3m")}</p>
          </div>
        )}
      </header>

      <section>
        <h2 className="section-title mb-2">🏷️ {t(lang, "sources_today")}</h2>
        <ul className="card divide-y divide-border text-sm">
          {sources.map((s) => (
            <li key={s.key} className="flex items-center justify-between px-4 py-2.5">
              <span>
                {t(lang, s.key)}
                {s.note && <span className="ml-2 text-xs text-muted">{s.note}</span>}
              </span>
              <span className="num font-bold">{s.price !== null ? `${fmtTaka(lang, s.price)}/${unit}` : "–"}</span>
            </li>
          ))}
        </ul>
      </section>

      <ForecastCard lang={lang} commodity={commodity} entry={entry} current={cp} />

      <section>
        <h2 className="section-title mb-2">✍️ {t(lang, "report_price")}</h2>
        <PriceReporter commodity={commodity} name={name} icon={c.icon} unit={unit} reference={referencePrice(commodity, cp)} source="no_discount_note" reported={{}} />
      </section>

      {device.role !== "farmer" && Object.keys(outlooks).length > 0 && (
        <section>
          <h2 className="section-title mb-2">📦 {t(lang, "stock_planner")}</h2>
          <TraderBoard
            items={[{ key: commodity, name, icon: c.icon, unit, buy: referencePrice(commodity, cp), outlooks, verified: Boolean(entry?.rows.some((r) => r.n_test >= 20)), mine: true }]}
          />
        </section>
      )}
    </div>
  );
}
