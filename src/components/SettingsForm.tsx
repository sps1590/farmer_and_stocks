"use client";

import { useState, useTransition } from "react";
import { updateSetting } from "@/lib/actions/device";
import { useI18n } from "./I18nProvider";
import { DIVISIONS } from "@/lib/geo";

type Named = { key: string; name_en: string; name_bn: string };

type Props = {
  device: { role: "farmer" | "trader" | "both"; lang: "en" | "bn"; district: string; commodities: string[]; pushes: number };
  divisions: Named[];
  districts: (Named & { division: string })[];
  commodities: (Named & { icon: string })[];
};

/** Every setting is a tap; each change is saved immediately. */
export function SettingsForm({ device, divisions, districts, commodities }: Props) {
  const { t, lang } = useI18n();
  const [pending, start] = useTransition();
  const [savedField, setSavedField] = useState<string | null>(null);
  const [division, setDivision] = useState(districts.find((d) => d.key === device.district)?.division ?? DIVISIONS[0].key);
  const [picked, setPicked] = useState(device.commodities);
  const name = (x: Named) => (lang === "bn" ? x.name_bn : x.name_en);

  function save(input: Parameters<typeof updateSetting>[0]) {
    start(async () => {
      const r = await updateSetting(input);
      setSavedField(r.error ? null : input.field);
    });
  }

  const savedMark = (field: string) => (savedField === field && !pending ? <span className="ml-2 text-xs font-normal text-good">✓ {t("saved_settings")}</span> : null);

  return (
    <div className="space-y-5" aria-busy={pending}>
      <section>
        <h2 className="mb-2 font-bold">
          {t("language")}
          {savedMark("lang")}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {(["bn", "en"] as const).map((l) => (
            <button key={l} type="button" className="tap" aria-pressed={device.lang === l} onClick={() => save({ field: "lang", value: l })}>
              {l === "bn" ? "বাংলা" : "English"}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-bold">
          {t("role")}
          {savedMark("role")}
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {(["farmer", "trader", "both"] as const).map((r) => (
            <button key={r} type="button" className="tap text-sm" aria-pressed={device.role === r} onClick={() => save({ field: "role", value: r })}>
              {t(r === "farmer" ? "role_farmer" : r === "trader" ? "role_trader" : "role_both")}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-bold">
          {t("district")}
          {savedMark("district")}
        </h2>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {divisions.map((d) => (
            <button key={d.key} type="button" className="tap min-h-9 px-3 text-sm" aria-pressed={division === d.key} onClick={() => setDivision(d.key)}>
              {name(d)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {districts
            .filter((d) => d.division === division)
            .map((d) => (
              <button key={d.key} type="button" className="tap text-sm" aria-pressed={device.district === d.key} onClick={() => save({ field: "district", value: d.key })}>
                {name(d)}
              </button>
            ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-bold">
          {t("commodities")}
          {savedMark("commodities")}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {commodities.map((c) => {
            const on = picked.includes(c.key);
            return (
              <button
                key={c.key}
                type="button"
                className="tap justify-start text-left text-sm"
                aria-pressed={on}
                disabled={(on && picked.length === 1) || (!on && picked.length >= 12)}
                onClick={() => {
                  const next = on ? picked.filter((k) => k !== c.key) : [...picked, c.key];
                  setPicked(next);
                  save({ field: "commodities", value: next });
                }}
              >
                <span aria-hidden className="text-xl">{c.icon}</span>
                {name(c)}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-bold">
          {t("reminders")}
          {savedMark("pushes")}
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((n) => (
            <button key={n} type="button" className="tap" aria-pressed={device.pushes === n} onClick={() => save({ field: "pushes", value: n })}>
              {n === 0 ? t("reminders_0") : lang === "bn" ? "০১২৩"[n] : n}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
