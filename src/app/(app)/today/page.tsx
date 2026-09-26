import Link from "next/link";
import { requireDevice } from "@/lib/device";
import { getDb } from "@/lib/db";
import { fmtPct, fmtTaka, monthName, t } from "@/lib/i18n";
import { UNIT_LABEL } from "@/lib/catalog";
import { DISTRICT_BY_KEY } from "@/lib/geo";
import { placeLabel } from "@/lib/admin-geo";
import { referencePrice } from "@/lib/queries";
import { cropPlan, hotItems, marketRows } from "@/lib/market";
import { bdHour, bdToday, currentSlot } from "@/lib/time";
import { WeatherHero } from "@/components/WeatherHero";
import { WeatherCheckin } from "@/components/WeatherCheckin";
import { PushManager } from "@/components/PushManager";
import { FlagPill } from "@/components/Flag";
import { MyItems, type MyItem } from "@/components/MyItems";
import { UpdatePricesButton } from "@/components/UpdatePricesButton";
import { Change } from "@/components/DailyPrices";
import { dailyBoard } from "@/lib/daily";
import { refreshStatus } from "@/lib/refresh";
import { COMMODITY_BY_KEY } from "@/lib/catalog";

// The "Update today's price" button runs its scrape in after(), bounded by this.
export const maxDuration = 300;

const FLAG_RANK = { green: 0, orange: 1, red: 2 } as const;

export default async function HomePage() {
  const device = await requireDevice();
  const lang = device.lang;
  const slot = currentSlot();
  const today = bdToday();
  const sql = await getDb();
  const district = DISTRICT_BY_KEY.get(device.district)!;
  const showGrow = device.role !== "trader";
  const showHot = device.role !== "farmer";

  const [weather, reported, rows, plan, board, status] = await Promise.all([
    sql`SELECT rain, heat, storm FROM weather_reports WHERE device_id = ${device.id} AND report_date = ${today} AND slot = ${slot}`.then(
      (r) => r as { rain: "none" | "light" | "heavy"; heat: number; storm: boolean }[],
    ),
    sql`SELECT commodity, price_type, price::float FROM price_reports WHERE device_id = ${device.id} AND report_date = ${today}`.then(
      (r) => r as { commodity: string; price_type: "wholesale" | "retail"; price: number }[],
    ),
    marketRows(device.district),
    showGrow ? cropPlan(device.district) : Promise.resolve([]),
    dailyBoard(),
    refreshStatus(),
  ]);
  const moves = [...board.values()]
    .filter((d) => d.dayChange !== null && Math.abs(d.dayChange) >= 0.005 && COMMODITY_BY_KEY.has(d.commodity))
    .sort((a, b) => Math.abs(b.dayChange!) - Math.abs(a.dayChange!))
    .slice(0, 4);

  const hot = hotItems(rows, 3);
  const growTop = plan
    .filter((p) => p.monthsToPlant <= 2)
    .sort((a, b) => FLAG_RANK[a.flag] - FLAG_RANK[b.flag] || b.score - a.score)
    .slice(0, 3);

  const greeting = bdHour() < 12 ? "good_morning" : bdHour() < 17 ? "good_afternoon" : "good_evening";
  const rowByKey = new Map(rows.map((r) => [r.c.key, r]));
  const myItems: MyItem[] = device.commodities
    .filter((k) => rowByKey.has(k))
    .map((k) => {
      const r = rowByKey.get(k)!;
      const cp = r.prices;
      return {
        key: k,
        name: lang === "bn" ? r.c.name_bn : r.c.name_en,
        icon: r.c.icon,
        unit: UNIT_LABEL[r.c.unit][lang],
        price: r.price,
        change: r.change,
        flag: r.flag,
        reference: referencePrice(k, cp),
        source: cp?.crowd ? "src_crowd" : cp?.avg ? "no_discount_note" : cp?.tcb ? "src_tcb" : cp?.wfp ? "src_wfp" : "src_default",
        reported: Object.fromEntries(reported.filter((x) => x.commodity === k).map((x) => [x.price_type, x.price])),
      };
    });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted">{t(lang, greeting)} 👋</p>
        <h1 className="text-2xl font-extrabold">{t(lang, "app_name")}</h1>
      </header>

      <WeatherHero
        lang={lang}
        district={device.district}
        lat={device.lat}
        lon={device.lon}
        placeLabel={placeLabel(device, lang === "bn" ? district.name_bn : district.name_en, lang)}
      />

      {showGrow && (
        <section>
          <div className="mb-2 flex items-end justify-between gap-2">
            <div>
              <h2 className="section-title">🌱 {t(lang, "grow_title")}</h2>
              <p className="text-xs text-muted">{t(lang, "plan_now")}</p>
            </div>
            <Link href="/farmer" className="text-sm font-semibold text-primary">
              {t(lang, "details")} →
            </Link>
          </div>
          <ul className="grid gap-2">
            {growTop.map((p) => (
              <li key={p.crop.key} className={`card flag-bar-${p.flag} flex items-center gap-3 p-3`}>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{lang === "bn" ? p.crop.name_bn : p.crop.name_en}</p>
                  <p className="text-xs text-muted">
                    {t(lang, "plant_in")} {monthName(lang, p.plantMonth)} → {t(lang, "harvest_in")} {monthName(lang, p.harvestMonth)}
                    {p.priceChange !== null && ` · ${fmtPct(lang, p.priceChange, true)}`}
                  </p>
                </div>
                <FlagPill flag={p.flag} lang={lang} />
              </li>
            ))}
            {!growTop.length && <li className="card p-3 text-sm text-muted">{t(lang, "no_suggestions")}</li>}
          </ul>
        </section>
      )}

      {showHot && (
        <section>
          <div className="mb-2 flex items-end justify-between gap-2">
            <div>
              <h2 className="section-title">🔥 {t(lang, "hot_title")}</h2>
              <p className="text-xs text-muted">{t(lang, "hot_hint")}</p>
            </div>
            <Link href="/trader" className="text-sm font-semibold text-primary">
              {t(lang, "market_title")} →
            </Link>
          </div>
          {!hot.some((r) => r.flag === "green") && <p className="mb-2 text-xs text-muted">🟠 {t(lang, "hot_none")}</p>}
          {hot.length ? (
            <ul className="grid grid-cols-3 gap-2">
              {hot.map((r) => (
                <li key={r.c.key}>
                  <Link href={`/market/${r.c.key}`} className={`card flag-bar-${r.flag} block h-full p-3`}>
                    <span className="text-2xl" aria-hidden>
                      {r.c.icon}
                    </span>
                    <p className="mt-1 truncate text-sm font-bold">{lang === "bn" ? r.c.name_bn : r.c.name_en}</p>
                    <p className={`num text-lg font-extrabold ${r.flag === "green" ? "text-flag-green" : "text-flag-orange"}`}>
                      ▲ {fmtPct(lang, r.change ?? 0, true)}
                    </p>
                    {r.price !== null && <p className="num text-xs text-muted">{fmtTaka(lang, r.price)}</p>}
                    {r.flag && (
                      <span className="mt-1 block">
                        <FlagPill flag={r.flag} lang={lang} />
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="card p-3 text-sm text-muted">🟠 {t(lang, "hot_none")}</p>
          )}
        </section>
      )}

      <section>
        <h2 className="section-title mb-1">☝️ {t(lang, "checkin_title")}</h2>
        <p className="mb-2 text-xs text-muted">{t(lang, "checkin_hint")}</p>
        <WeatherCheckin slot={slot} existing={weather[0] ?? null} />
      </section>

      <section className="space-y-2">
        <h2 className="section-title">🏷️ {t(lang, "tab_today_prices")}</h2>
        <UpdatePricesButton initial={status} />
        {moves.length > 0 && (
          <div className="card p-3">
            <p className="mb-2 text-xs font-semibold text-muted">{t(lang, "biggest_moves")} · {t(lang, "day_change")}</p>
            <ul className="grid grid-cols-2 gap-2">
              {moves.map((d) => {
                const c = COMMODITY_BY_KEY.get(d.commodity)!;
                return (
                  <li key={d.commodity}>
                    <Link href={`/market/${c.key}`} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-2.5 py-2 text-sm">
                      <span className="truncate font-semibold">
                        <span aria-hidden>{c.icon}</span> {lang === "bn" ? c.name_bn : c.name_en}
                      </span>
                      <span className="shrink-0 text-xs">
                        <Change value={d.dayChange} lang={lang} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title mb-2">🧺 {t(lang, "my_items")}</h2>
        <MyItems items={myItems} />
      </section>

      <PushManager hasPush={device.has_push} vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
    </div>
  );
}
