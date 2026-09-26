"use client";

import { useState, useTransition } from "react";
import { submitWeather } from "@/lib/actions/reports";
import { useI18n } from "./I18nProvider";
import type { DictKey } from "@/lib/i18n";

type Answer = { rain: "none" | "light" | "heavy"; heat: number; storm: boolean };

const RAIN: { v: Answer["rain"]; icon: string; key: DictKey }[] = [
  { v: "none", icon: "☀️", key: "rain_none" },
  { v: "light", icon: "🌦️", key: "rain_light" },
  { v: "heavy", icon: "🌧️", key: "rain_heavy" },
];
const HEAT: { v: number; icon: string; key: DictKey }[] = [
  { v: 1, icon: "🥶", key: "heat_1" },
  { v: 2, icon: "🙂", key: "heat_2" },
  { v: 3, icon: "😊", key: "heat_3" },
  { v: 4, icon: "🥵", key: "heat_4" },
  { v: 5, icon: "🔥", key: "heat_5" },
];

/** Three tap questions; the answer is saved automatically after the last tap. */
export function WeatherCheckin({ slot, existing }: { slot: 1 | 2 | 3; existing: Answer | null }) {
  const { t } = useI18n();
  const [rain, setRain] = useState<Answer["rain"] | null>(null);
  const [heat, setHeat] = useState<number | null>(null);
  const [done, setDone] = useState(Boolean(existing));
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  function save(storm: boolean) {
    if (!rain || !heat) return;
    setError(false);
    start(async () => {
      const r = await submitWeather({ slot, rain, heat, storm });
      if (r.error) setError(true);
      else setDone(true);
    });
  }

  const slotKey = (`slot_${slot}` as DictKey);

  if (done) {
    return (
      <section className="card flex items-center justify-between gap-3 p-4">
        <p className="font-semibold text-good">✓ {t("thanks_weather")}</p>
        <button
          type="button"
          className="tap shrink-0 text-sm"
          onClick={() => {
            setDone(false);
            setRain(null);
            setHeat(null);
          }}
        >
          {t("change_answer")}
        </button>
      </section>
    );
  }

  return (
    <section className="card space-y-4 p-4" aria-busy={pending}>
      <span className="chip">{t(slotKey)}</span>

      <fieldset>
        <legend className="mb-2 font-bold">{t(slot === 3 ? "q_rain_evening" : "q_rain")}</legend>
        <div className="grid grid-cols-3 gap-2">
          {RAIN.map((o) => (
            <button key={o.v} type="button" className="tap flex-col" aria-label={t(o.key)} aria-pressed={rain === o.v} onClick={() => setRain(o.v)}>
              <span aria-hidden className="text-2xl">{o.icon}</span>
              <span className="text-sm">{t(o.key)}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {rain && (
        <fieldset>
          <legend className="mb-2 font-bold">{t("q_heat")}</legend>
          <div className="grid grid-cols-5 gap-1.5">
            {HEAT.map((o) => (
              <button key={o.v} type="button" className="tap flex-col px-1" aria-label={t(o.key)} aria-pressed={heat === o.v} onClick={() => setHeat(o.v)}>
                <span aria-hidden className="text-2xl">{o.icon}</span>
                <span className="text-[11px] leading-tight">{t(o.key)}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {rain && heat && (
        <fieldset>
          <legend className="mb-2 font-bold">{t("q_storm")}</legend>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="tap" disabled={pending} onClick={() => save(true)}>
              🌪️ {t("yes")}
            </button>
            <button type="button" className="tap" disabled={pending} onClick={() => save(false)}>
              🍃 {t("no")}
            </button>
          </div>
        </fieldset>
      )}
      {error && <p className="text-sm text-bad">{t("error_generic")}</p>}
    </section>
  );
}
