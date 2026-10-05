import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  CloudDrizzle,
  CloudLightning,
  CloudRain,
  Flame,
  Hand,
  Package,
  Sparkles,
  Sprout,
  Star,
  Sun,
  Tags,
  ThermometerSun,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { requireDevice } from "@/lib/device";
import { getDb } from "@/lib/db";
import { fill, fmtNum, fmtPct, fmtTaka, monthName, t, type DictKey } from "@/lib/i18n";
import { UNIT_LABEL } from "@/lib/catalog";
import { DISTRICT_BY_KEY } from "@/lib/geo";
import { placeLabel } from "@/lib/admin-geo";
import { referencePrice, weatherForecast } from "@/lib/queries";
import { cropPlan, marketRows } from "@/lib/market";
import { dailyBoard, dailySeries } from "@/lib/daily";
import { refreshStatus } from "@/lib/refresh";
import { weatherNow } from "@/lib/weather-now";
import { buildBrief, type BriefIcon, type BriefLine } from "@/lib/brief";
import { compareFlagged } from "@/lib/recommend";
import { bdHour, bdToday, currentSlot } from "@/lib/time";
import { WeatherPanel } from "@/components/WeatherPanel";
import { WeatherCheckin } from "@/components/WeatherCheckin";
import { PushManager } from "@/components/PushManager";
import { FlagPill } from "@/components/Flag";
import { MyItems, type MyItem } from "@/components/MyItems";
import { UpdatePricesButton } from "@/components/UpdatePricesButton";
import { Sparkline } from "@/components/Sparkline";
import { BrandHeader } from "@/components/Logo";
import { FlagIcon, ItemAvatar } from "@/components/icons";

// The "Update today's price" button runs its scrape in after(), bounded by this.
export const maxDuration = 300;

const PLANT_RANK = { green: 0, orange: 1, red: 2 } as const; // best crops to plant first
const BRIEF_ICON: Record<BriefIcon, LucideIcon> = {
  storm: CloudLightning,
  rain: CloudRain,
  heat: ThermometerSun,
  sun: Sun,
  drizzle: CloudDrizzle,
  up: TrendingUp,
  down: TrendingDown,
  plant: Sprout,
  gain: TrendingUp,
  loss: TrendingDown,
};
const TONE: Record<BriefLine["tone"], string> = { good: "text-flag-green", warn: "text-flag-orange", bad: "text-flag-red", info: "text-foreground" };

export default async function HomePage() {
  const device = await requireDevice();
  const lang = device.lang;
  const slot = currentSlot();
  const today = bdToday();
  const sql = await getDb();
  const district = DISTRICT_BY_KEY.get(device.district)!;
  const showGrow = device.role !== "trader";
  const showTrade = device.role !== "farmer";
  const name = (x: { name_en: string; name_bn: string }) => (lang === "bn" ? x.name_bn : x.name_en);

  const [checkin, reported, rows, plan, board, status, spark, now, days] = await Promise.all([
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
    dailySeries(30),
    weatherNow(device.lat ?? district.lat, device.lon ?? district.lon),
    weatherForecast(device.district, 7),
  ]);

  // --- Watchlist: the user's items, most-moved first -------------------------
  const rowByKey = new Map(rows.map((r) => [r.c.key, r]));
  const myItems: MyItem[] = device.commodities
    .filter((k) => rowByKey.has(k))
    .map((k) => {
      const r = rowByKey.get(k)!;
      const d = board.get(k);
      return {
        key: k,
        name: name(r.c),
        icon: r.c.icon,
        unit: UNIT_LABEL[r.c.unit][lang],
        price: r.price,
        day: d?.dayChange ?? null,
        week: d?.weekChange ?? null,
        outlook: r.change,
        flag: r.flag,
        spark: spark.get(k) ?? [],
        reference: referencePrice(k, r.prices),
        source: r.prices?.crowd ? "src_crowd" : r.prices?.avg ? "no_discount_note" : r.prices?.tcb ? "src_tcb" : r.prices?.wfp ? "src_wfp" : "src_default",
        reported: Object.fromEntries(reported.filter((x) => x.commodity === k).map((x) => [x.price_type, x.price])),
      };
    })
    .sort((a, b) => Math.abs(b.week ?? 0) - Math.abs(a.week ?? 0));

  // --- Opportunities & risks: clear 3-month calls, profit first then loss ---
  const calls = rows
    .filter((r) => r.flag === "green" || r.flag === "red")
    .sort((a, b) => compareFlagged({ flag: a.flag, value: a.change }, { flag: b.flag, value: b.change }))
    .slice(0, 8);
  const plantNext = plan
    .filter((p) => p.monthsToPlant <= 2)
    .sort((a, b) => PLANT_RANK[a.flag] - PLANT_RANK[b.flag] || b.score - a.score)
    .slice(0, 6);

  // --- Today's brief ---------------------------------------------------------
  const mover = myItems.find((i) => i.week !== null) ?? null;
  const brief = buildBrief({
    weather: now || days[0] ? { code: now?.code ?? days[0]?.weather_code ?? null, rainChance: now?.rainChance ?? days[0]?.precip_prob ?? null, tmax: days[0]?.tmax ?? now?.todayMax ?? null } : null,
    mover: mover ? { key: mover.key, name: mover.name, change: mover.week! } : null,
    crop: plantNext[0] ? { name: name(plantNext[0].crop), flag: plantNext[0].flag } : null,
    outlook: showTrade && calls[0] ? { key: calls[0].c.key, name: name(calls[0].c), change: calls[0].change ?? 0, flag: calls[0].flag! } : null,
    checkedIn: checkin.length > 0,
    pricesFresh: Boolean(status.finishedAt && new Date(new Date(status.finishedAt).getTime() + 6 * 3600_000).toISOString().slice(0, 10) === today),
  });
  const lineText = (l: BriefLine) =>
    fill(t(lang, l.key), {
      name: l.vars.name ?? "",
      pct: l.vars.pct !== undefined ? fmtPct(lang, l.vars.pct) : "",
      temp: l.vars.temp !== undefined ? fmtNum(lang, l.vars.temp) : "",
    });

  const greeting: DictKey = bdHour() < 12 ? "good_morning" : bdHour() < 17 ? "good_afternoon" : "good_evening";
  const actions: { href: string; icon: LucideIcon; label: DictKey }[] = [
    { href: "#checkin", icon: Hand, label: "qa_checkin" },
    { href: "/trader", icon: Tags, label: "qa_prices" },
    ...(showGrow ? [{ href: "/farmer", icon: Sprout, label: "qa_plan" as const }] : []),
    ...(showTrade ? [{ href: "/trader?view=stock", icon: Package, label: "qa_stock" as const }] : []),
    { href: "/accuracy", icon: BadgeCheck, label: "qa_accuracy" },
  ];

  return (
    <div className="space-y-5">
      <header className="rise">
        <BrandHeader name={t(lang, "app_name")} />
        <h1 className="mt-3 text-3xl font-bold leading-tight">
          <span className="text-gradient">{t(lang, greeting)}</span>
        </h1>
      </header>

      {/* 1. The answer first: what matters today, and the one thing to do next. */}
      <section className="card-glow rise p-4" aria-labelledby="brief-title">
        <h2 id="brief-title" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-muted">
          <Sparkles className="size-4 text-primary" aria-hidden /> {t(lang, "brief_title")}
        </h2>
        <ul className="mt-2 space-y-0.5">
          {brief.lines.map((l) => {
            const Icon = BRIEF_ICON[l.icon];
            const body = (
              <>
                <Icon className={`mt-0.5 size-5 shrink-0 ${TONE[l.tone]}`} aria-hidden />
                <span className={`flex-1 font-semibold leading-snug ${TONE[l.tone]}`}>{lineText(l)}</span>
                {l.href && <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />}
              </>
            );
            return (
              <li key={l.key}>
                {l.href ? (
                  <Link href={l.href} className="flex min-h-11 items-start gap-2.5 py-1">
                    {body}
                  </Link>
                ) : (
                  <p className="flex items-start gap-2.5 py-1">{body}</p>
                )}
              </li>
            );
          })}
          {!brief.lines.length && (
            <li className="flex items-center gap-2.5 py-1 font-semibold">
              <Sun className="size-5 shrink-0 text-primary" aria-hidden /> {t(lang, "brief_empty")}
            </li>
          )}
        </ul>
        <Link href={brief.action.href} className="btn-primary mt-3 w-full">
          {t(lang, brief.action.key)} <ArrowRight className="size-5" aria-hidden />
        </Link>
      </section>

      {/* 2. Weather: tap a day for its details. */}
      <WeatherPanel
        place={placeLabel(device, name(district), lang)}
        now={now ? { temp: now.temp, feels: now.feels, humidity: now.humidity, wind: now.wind, code: now.code, isDay: now.isDay, rainChance: now.rainChance } : null}
        days={days}
      />

      {/* 3. Shortcuts */}
      <nav className="snap-row" aria-label="shortcuts">
        {actions.map((a) => (
          <Link key={a.label} href={a.href} className="flex w-[4.75rem] flex-col items-center gap-1.5 text-center text-xs font-semibold leading-tight">
            <span className="card flex size-14 items-center justify-center rounded-full text-primary" aria-hidden>
              <a.icon className="size-6" />
            </span>
            {t(lang, a.label)}
          </Link>
        ))}
      </nav>

      {/* 4. Clear calls, swipeable */}
      {showGrow && plantNext.length > 0 && (
        <section>
          <div className="mb-2 flex items-end justify-between gap-2">
            <h2 className="section-title">
              <Sprout className="size-5 text-primary" aria-hidden /> {t(lang, "plant_now")}
            </h2>
            <Link href="/farmer" className="inline-flex min-h-11 items-center gap-0.5 text-sm font-semibold text-primary">
              {t(lang, "details")} <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ul className="snap-row">
            {plantNext.map((p) => (
              <li key={p.crop.key} className="w-44">
                <Link href="/farmer" className={`card flag-bar-${p.flag} flex h-full flex-col gap-1.5 p-3`}>
                  <span className="text-base font-bold leading-tight">{name(p.crop)}</span>
                  <span className="text-xs text-muted">
                    {monthName(lang, p.plantMonth)} – {monthName(lang, p.harvestMonth)}
                  </span>
                  <span className="mt-auto flex items-center justify-between gap-1 pt-1">
                    <FlagPill flag={p.flag} lang={lang} />
                    {p.priceChange !== null && <span className="num text-xs font-bold">{fmtPct(lang, p.priceChange, true)}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showTrade && (
        <section>
          <div className="mb-2 flex items-end justify-between gap-2">
            <div>
              <h2 className="section-title">
                <Flame className="size-5 text-primary" aria-hidden /> {t(lang, "opportunities")}
              </h2>
              <p className="text-xs text-muted">{t(lang, "opportunities_hint")}</p>
            </div>
            <Link href="/trader?view=outlook" className="inline-flex min-h-11 items-center gap-0.5 text-sm font-semibold text-primary">
              {t(lang, "market_title")} <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
          {calls.length ? (
            <ul className="snap-row">
              {calls.map((r) => (
                <li key={r.c.key} className="w-40">
                  <Link href={`/market/${r.c.key}`} className={`card flag-bar-${r.flag} flex h-full flex-col gap-1 p-3`}>
                    <span className="flex items-center justify-between">
                      <ItemAvatar icon={r.c.icon} />
                      <Sparkline values={spark.get(r.c.key) ?? []} width={64} />
                    </span>
                    <span className="truncate text-sm font-bold">{name(r.c)}</span>
                    <span className={`big-num flex items-center gap-1 text-2xl font-bold ${r.flag === "green" ? "text-flag-green" : "text-flag-red"}`}>
                      <FlagIcon flag={r.flag!} className="size-5 shrink-0" /> {fmtPct(lang, Math.abs(r.change ?? 0))}
                    </span>
                    <span className="num text-xs text-muted">{r.price !== null ? `${fmtTaka(lang, r.price)}/${UNIT_LABEL[r.c.unit][lang]}` : ""}</span>
                    <span className="pt-1">
                      <FlagPill flag={r.flag!} lang={lang} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="card p-3 text-sm text-muted">{t(lang, "hot_none")}</p>
          )}
        </section>
      )}

      {/* 5. Watchlist */}
      <section id="prices" className="scroll-mt-4 space-y-2">
        <h2 className="section-title">
          <Star className="size-5 text-primary" aria-hidden /> {t(lang, "watchlist")}
        </h2>
        <MyItems items={myItems} />
        <UpdatePricesButton initial={status} />
      </section>

      {/* 6. Contribute */}
      <section id="checkin" className="scroll-mt-4">
        <h2 className="section-title mb-1">
          <Hand className="size-5 text-primary" aria-hidden /> {t(lang, "checkin_title")}
        </h2>
        <p className="mb-2 text-xs text-muted">{t(lang, "checkin_hint")}</p>
        <WeatherCheckin slot={slot} existing={checkin[0] ?? null} />
      </section>

      <PushManager hasPush={device.has_push} vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
    </div>
  );
}
