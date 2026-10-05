"use client";

import { Droplets, MapPin } from "lucide-react";
import { WxIcon } from "./icons";
import { useState } from "react";
import { useI18n } from "./I18nProvider";
import { useTween } from "./useTween";
import { describeCode } from "@/lib/wx";
import { dayName, fmtNum } from "@/lib/i18n";

export type PanelNow = { temp: number; feels: number; humidity: number; wind: number; code: number; isDay: boolean; rainChance: number | null };
export type PanelDay = { date: string; tmax: number | null; tmin: number | null; precip_mm: number | null; precip_prob: number | null; wind_max: number | null; weather_code: number | null };

/**
 * Weather card. "Now" is selected by default; tapping a day in the strip
 * swaps the headline and the detail tiles to that day's forecast.
 */
export function WeatherPanel({ now, days, place }: { now: PanelNow | null; days: PanelDay[]; place: string }) {
  const { t, lang } = useI18n();
  // -1 = current conditions, otherwise an index into `days`.
  const [sel, setSel] = useState(now ? -1 : 0);
  const day = sel >= 0 ? days[sel] : null;
  const desc = day ? describeCode(day.weather_code ?? 0) : now ? describeCode(now.code, now.isDay) : null;
  const code = day ? (day.weather_code ?? 0) : (now?.code ?? 0);
  const tone = code >= 51 ? "hero-rain" : !day && now && !now.isDay ? "hero-night" : "";
  const headline = day ? day.tmax : (now?.temp ?? null);
  const shownTemp = useTween(headline ?? 0);
  const kmh = lang === "bn" ? "কিমি/ঘ" : "km/h";
  const deg = (v: number | null) => (v !== null ? `${fmtNum(lang, v)}°` : "–");

  const tiles: [string, string][] = day
    ? [
        [t("high_low"), `${deg(day.tmax)} / ${deg(day.tmin)}`],
        [t("rain_chance_label"), `${fmtNum(lang, day.precip_prob ?? 0)}%`],
        [t("rain_amount"), `${fmtNum(lang, day.precip_mm ?? 0, 1)} mm`],
        [t("wind"), day.wind_max !== null ? `${fmtNum(lang, day.wind_max)} ${kmh}` : "–"],
      ]
    : now
      ? [
          [t("feels_like"), deg(now.feels)],
          [t("humidity"), `${fmtNum(lang, now.humidity)}%`],
          [t("wind"), `${fmtNum(lang, now.wind)} ${kmh}`],
          [t("rain_today"), now.rainChance !== null ? `${fmtNum(lang, now.rainChance)}%` : "–"],
        ]
      : [];

  if (!now && !days.length) {
    return <section className="hero p-5 font-semibold">{t("no_weather_yet")}</section>;
  }

  const chip = (active: boolean) =>
    `flex min-h-11 min-w-[3.6rem] shrink-0 cursor-pointer flex-col items-center gap-1 rounded-2xl border px-2 py-2 text-xs transition-colors ${
      active ? "border-white/60 bg-white/20 font-bold" : "border-white/10 bg-white/5 opacity-85"
    }`;

  return (
    <section className={`hero ${tone} rise p-4`} aria-label={t("weather_now")}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate text-xs font-semibold opacity-85">
            <MapPin className="size-3.5 shrink-0" aria-hidden /> {place}
          </p>
          <p className="big-num mt-1 text-6xl font-bold leading-none" aria-live="polite">
            {headline !== null ? deg(Math.round(shownTemp)) : "–"}
          </p>
          <p className="mt-1.5 text-sm font-semibold">
            {day ? dayName(lang, day.date) : t("now_label")} · {desc ? t(desc.key) : ""}
          </p>
        </div>
        {desc && (
          <WxIcon code={code} isDay={day ? true : (now?.isDay ?? true)} className="float size-16 shrink-0 drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]" />
        )}
      </div>

      <dl className="mt-3 grid grid-cols-4 gap-1.5 text-center text-xs">
        {tiles.map(([k, v]) => (
          <div key={k} className="hero-tile px-1 py-1.5">
            <dt className="leading-tight opacity-80">{k}</dt>
            <dd className="num mt-0.5 text-sm font-bold">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label={t("weather_7day")}>
        {now && (
          <button type="button" className={chip(sel === -1)} aria-pressed={sel === -1} onClick={() => setSel(-1)}>
            <span>{t("now_label")}</span>
            <WxIcon code={now.code} isDay={now.isDay} />
            <span className="num">{deg(now.temp)}</span>
          </button>
        )}
        {days.map((d, i) => (
          <button key={d.date} type="button" className={chip(sel === i)} aria-pressed={sel === i} onClick={() => setSel(i)}>
            <span>{dayName(lang, d.date)}</span>
            <WxIcon code={d.weather_code ?? 0} />
            <span className="num">{deg(d.tmax)}</span>
            <span className="num inline-flex items-center gap-0.5 text-xs opacity-80">
              <Droplets className="size-3" aria-hidden />
              {fmtNum(lang, d.precip_prob ?? 0)}%
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
