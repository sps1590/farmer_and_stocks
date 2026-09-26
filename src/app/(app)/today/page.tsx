import { requireDevice } from "@/lib/device";
import { getDb } from "@/lib/db";
import { t, dayName } from "@/lib/i18n";
import { COMMODITY_BY_KEY, UNIT_LABEL } from "@/lib/catalog";
import { DISTRICT_BY_KEY } from "@/lib/geo";
import { currentPrices, referencePrice } from "@/lib/queries";
import { bdToday, currentSlot } from "@/lib/time";
import { WeatherCheckin } from "@/components/WeatherCheckin";
import { PriceReporter } from "@/components/PriceReporter";
import { PushManager } from "@/components/PushManager";

export default async function TodayPage() {
  const device = await requireDevice();
  const lang = device.lang;
  const slot = currentSlot();
  const today = bdToday();
  const sql = await getDb();

  const [weather, reported, prices] = await Promise.all([
    sql`SELECT rain, heat, storm FROM weather_reports WHERE device_id = ${device.id} AND report_date = ${today} AND slot = ${slot}`.then(
      (r) => r as { rain: "none" | "light" | "heavy"; heat: number; storm: boolean }[],
    ),
    sql`SELECT commodity, price_type, price::float FROM price_reports WHERE device_id = ${device.id} AND report_date = ${today}`.then(
      (r) => r as { commodity: string; price_type: "wholesale" | "retail"; price: number }[],
    ),
    currentPrices(device.district),
  ]);

  const district = DISTRICT_BY_KEY.get(device.district);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-muted">
          {dayName(lang, today)} · {district ? (lang === "bn" ? district.name_bn : district.name_en) : device.district}
        </p>
        <h1 className="text-2xl font-bold">{t(lang, "today_title")}</h1>
      </header>

      <WeatherCheckin slot={slot} existing={weather[0] ?? null} />

      <section>
        <h2 className="text-lg font-bold">{t(lang, "prices_title")}</h2>
        <p className="mb-3 text-sm text-muted">{t(lang, "prices_hint")}</p>
        <div className="space-y-3">
          {device.commodities
            .filter((k) => COMMODITY_BY_KEY.has(k))
            .map((k) => {
              const c = COMMODITY_BY_KEY.get(k)!;
              const cp = prices.get(k);
              const source = cp?.crowd ? "src_crowd" : cp?.tcb ? "src_tcb" : cp?.wfp ? "src_wfp" : "src_default";
              return (
                <PriceReporter
                  key={k}
                  commodity={k}
                  name={lang === "bn" ? c.name_bn : c.name_en}
                  icon={c.icon}
                  unit={UNIT_LABEL[c.unit][lang]}
                  reference={referencePrice(k, cp)}
                  source={source}
                  reported={Object.fromEntries(reported.filter((r) => r.commodity === k).map((r) => [r.price_type, r.price]))}
                />
              );
            })}
        </div>
      </section>

      <PushManager hasPush={device.has_push} vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
    </div>
  );
}
