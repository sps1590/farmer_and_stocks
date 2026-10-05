"use client";

import { Bell, Check, Languages, MapPin, ShoppingBasket, SunMoon, User } from "lucide-react";
import { useState, useTransition } from "react";
import { setTheme, updateSetting } from "@/lib/actions/device";
import { useI18n } from "./I18nProvider";
import { LocationPicker, type LocationValue } from "./LocationPicker";
import { GpsButton } from "./GpsButton";

type Named = { key: string; name_en: string; name_bn: string };

type Props = {
  device: {
    role: "farmer" | "trader" | "both";
    lang: "en" | "bn";
    district: string;
    division: string;
    upazila: number | null;
    union: number | null;
    commodities: string[];
    pushes: number;
    theme: "dark" | "light" | "system";
    lat: number | null;
    lon: number | null;
    place: string | null;
  };
  divisions: Named[];
  districts: (Named & { division: string })[];
  commodities: (Named & { icon: string })[];
};

/** Every setting is a tap; each change is saved immediately. */
export function SettingsForm({ device, divisions, districts, commodities }: Props) {
  const { t, lang } = useI18n();
  const [pending, start] = useTransition();
  const [savedField, setSavedField] = useState<string | null>(null);
  const [loc, setLoc] = useState<LocationValue>({ division: device.division, district: device.district, upazila: device.upazila, union: device.union });
  const [picked, setPicked] = useState(device.commodities);
  const name = (x: Named) => (lang === "bn" ? x.name_bn : x.name_en);

  function save(input: Parameters<typeof updateSetting>[0]) {
    start(async () => {
      const r = await updateSetting(input);
      setSavedField(r.error ? null : input.field);
    });
  }

  const savedMark = (field: string) =>
    savedField === field && !pending ? <span className="ml-2 inline-flex items-center gap-0.5 text-xs font-normal text-good">
        <Check className="size-3.5" aria-hidden /> {t("saved_settings")}
      </span> : null;

  function saveLocation(v: LocationValue) {
    if (!v.district) return;
    save({ field: "location", value: { district: v.district, upazila: v.upazila, union: v.union } });
  }

  function setCommodities(next: string[]) {
    if (!next.length) return;
    setPicked(next);
    save({ field: "commodities", value: next });
  }

  return (
    <div className="space-y-4" aria-busy={pending}>
      <section className="card space-y-3 p-4">
        <h2 className="section-title">
          <MapPin className="size-5 text-primary" aria-hidden /> {t("location_title")}
          {savedMark("location")}
        </h2>
        <LocationPicker
          lang={lang}
          t={t}
          divisions={divisions}
          districts={districts}
          value={loc}
          onChange={setLoc}
          onDone={saveLocation}
        />
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-sm font-semibold">{t("village_gps")}</p>
          <GpsButton lang={lang} t={t} current={{ lat: device.lat, lon: device.lon, place: device.place }} />
        </div>
      </section>

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="section-title">
            <ShoppingBasket className="size-5 text-primary" aria-hidden /> {t("commodities")}
            {savedMark("commodities")}
          </h2>
          <span className="text-xs text-muted">
            {picked.length} {t("selected_count")}
          </span>
        </div>
        <div className="mb-3 flex gap-2">
          <button type="button" className="tap min-h-11 px-3 text-sm" onClick={() => setCommodities(commodities.map((c) => c.key))}>
            {t("select_all")}
          </button>
          <button type="button" className="tap min-h-11 px-3 text-sm" onClick={() => setCommodities(picked.slice(0, 1))}>
            {t("clear_all")}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {commodities.map((c) => {
            const on = picked.includes(c.key);
            return (
              <button
                key={c.key}
                type="button"
                className="tap justify-start text-left text-sm"
                aria-label={name(c)}
                aria-pressed={on}
                disabled={on && picked.length === 1}
                onClick={() => setCommodities(on ? picked.filter((k) => k !== c.key) : [...picked, c.key])}
              >
                <span aria-hidden className="text-xl">{c.icon}</span>
                <span className="flex-1">{name(c)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card grid gap-4 p-4">
        <div>
          <h2 className="section-title mb-2">
            <SunMoon className="size-5 text-primary" aria-hidden /> {t("theme")}
            {savedMark("theme")}
          </h2>
          <div className="segmented grid-cols-3">
            {(["dark", "light", "system"] as const).map((v) => (
              <button
                key={v}
                type="button"
                className="min-h-11 rounded-xl text-sm font-bold"
                aria-pressed={device.theme === v}
                onClick={() =>
                  start(async () => {
                    await setTheme(v);
                    setSavedField("theme");
                  })
                }
              >
                {t(v === "dark" ? "theme_dark" : v === "light" ? "theme_light" : "theme_system")}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="section-title mb-2">
            <Languages className="size-5 text-primary" aria-hidden /> {t("language")}
            {savedMark("lang")}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {(["bn", "en"] as const).map((l) => (
              <button key={l} type="button" className="tap" aria-pressed={device.lang === l} onClick={() => save({ field: "lang", value: l })}>
                {l === "bn" ? "বাংলা" : "English"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="section-title mb-2">
            <User className="size-5 text-primary" aria-hidden /> {t("role")}
            {savedMark("role")}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {(["farmer", "trader", "both"] as const).map((r) => (
              <button key={r} type="button" className="tap text-sm" aria-pressed={device.role === r} onClick={() => save({ field: "role", value: r })}>
                {t(r === "farmer" ? "role_farmer" : r === "trader" ? "role_trader" : "role_both")}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="section-title mb-2">
            <Bell className="size-5 text-primary" aria-hidden /> {t("reminders")}
            {savedMark("pushes")}
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((n) => (
              <button key={n} type="button" className="tap" aria-pressed={device.pushes === n} onClick={() => save({ field: "pushes", value: n })}>
                {n === 0 ? t("reminders_0") : lang === "bn" ? "০১২৩"[n] : n}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
