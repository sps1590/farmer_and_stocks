"use client";

import { ArrowLeft, ArrowRight, Bell, Handshake, MapPin, Store, Tractor } from "lucide-react";
import { BrandHeader, LogoMark } from "@/components/Logo";
import { useState, useTransition } from "react";
import type { DictKey, Lang } from "@/lib/i18n";
import { createDevice, setWelcomeLanguage } from "@/lib/actions/device";
import { LocationPicker, type LocationValue } from "@/components/LocationPicker";

type Named = { key: string; name_en: string; name_bn: string };

type Props = {
  initialLang: Lang;
  dicts: Record<Lang, Record<DictKey, string>>;
  divisions: Named[];
  districts: (Named & { division: string })[];
  commodities: (Named & { icon: string })[];
};

const STEPS = ["lang", "role", "location", "commodities", "pushes"] as const;

export function Onboarding({ initialLang, dicts, divisions, districts, commodities }: Props) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<"farmer" | "trader" | "both" | null>(null);
  const [loc, setLoc] = useState<LocationValue>({ division: null, district: null, upazila: null, union: null });
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const t = (k: DictKey) => dicts[lang][k];
  const name = (x: Named) => (lang === "bn" ? x.name_bn : x.name_en);
  const go = (n: number) => setStep((s) => Math.min(STEPS.length - 1, Math.max(0, s + n)));

  function finish(pushes: number) {
    if (!role || !loc.district || !picked.length) return;
    setError(null);
    start(async () => {
      const r = await createDevice({
        role,
        lang,
        location: { district: loc.district!, upazila: loc.upazila, union: loc.union },
        commodities: picked,
        pushes,
      });
      if (r?.error) setError(r.error === "rate_limited" ? t("error_rate_limited") : t("error_generic"));
    });
  }

  const current = STEPS[step];

  return (
    <div>
      <header className="mb-6">
        <BrandHeader name={t("app_name")} />
        <div className="mt-3 flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s} className={`h-2 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
      </header>

      {current === "lang" && (
        <section className="rise">
          <LogoMark size={72} animated />
          <h1 className="mt-3 text-3xl font-extrabold">{t("welcome_title")}</h1>
          <p className="mt-2 text-muted">{t("welcome_body")}</p>
          <h2 className="mb-3 mt-8 font-bold">{t("choose_language")}</h2>
          <div className="grid grid-cols-2 gap-3">
            {(["bn", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                className="tap min-h-16 text-xl"
                aria-pressed={lang === l}
                onClick={() => {
                  setLang(l);
                  void setWelcomeLanguage(l);
                  go(1);
                }}
              >
                {l === "bn" ? "বাংলা" : "English"}
              </button>
            ))}
          </div>
        </section>
      )}

      {current === "role" && (
        <section className="rise">
          <h1 className="mb-4 text-2xl font-extrabold">{t("who_are_you")}</h1>
          <div className="grid gap-3">
            {([
              ["farmer", Tractor, "role_farmer"],
              ["trader", Store, "role_trader"],
              ["both", Handshake, "role_both"],
            ] as const).map(([r, Icon, key]) => (
              <button
                key={r}
                type="button"
                className="tap min-h-16 justify-start text-lg"
                aria-pressed={role === r}
                onClick={() => {
                  setRole(r);
                  go(1);
                }}
              >
                <Icon className="size-7 text-primary" aria-hidden /> {t(key)}
              </button>
            ))}
          </div>
        </section>
      )}

      {current === "location" && (
        <section className="rise">
          <h1 className="mb-4 flex items-center gap-2 text-2xl font-extrabold">
            <MapPin className="size-6 text-primary" aria-hidden /> {t("location_title")}
          </h1>
          <LocationPicker lang={lang} t={t} divisions={divisions} districts={districts} value={loc} onChange={setLoc} onDone={() => go(1)} />
        </section>
      )}

      {current === "commodities" && (
        <section className="rise">
          <h1 className="text-2xl font-extrabold">{t("choose_commodities")}</h1>
          <div className="mb-3 mt-2 flex items-center justify-between gap-2">
            <span className="text-sm text-muted">
              {picked.length} {t("selected_count")}
            </span>
            <span className="flex gap-2">
              <button type="button" className="tap min-h-11 px-3 text-sm" onClick={() => setPicked(commodities.map((c) => c.key))}>
                {t("select_all")}
              </button>
              <button type="button" className="tap min-h-11 px-3 text-sm" onClick={() => setPicked([])}>
                {t("clear_all")}
              </button>
            </span>
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
                  onClick={() => setPicked((p) => (on ? p.filter((k) => k !== c.key) : [...p, c.key]))}
                >
                  <span aria-hidden className="text-xl">{c.icon}</span>
                  <span className="flex-1">{name(c)}</span>
                </button>
              );
            })}
          </div>
          <div className="sticky bottom-0 -mx-4 mt-4 bg-background/95 px-4 py-3 backdrop-blur">
            <button type="button" className="btn-primary w-full" disabled={!picked.length} onClick={() => go(1)}>
              {t("next")} <ArrowRight className="size-5" aria-hidden />
            </button>
          </div>
        </section>
      )}

      {current === "pushes" && (
        <section className="rise">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold">
            <Bell className="size-6 text-primary" aria-hidden /> {t("how_many_reminders")}
          </h1>
          <p className="mb-4 text-muted">{t("reminders_hint")}</p>
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((n) => (
              <button key={n} type="button" className="tap min-h-16 text-xl" disabled={pending} onClick={() => finish(n)}>
                {n === 0 ? t("reminders_0") : lang === "bn" ? "০১২৩"[n] : n}
              </button>
            ))}
          </div>
          {pending && <p className="mt-4 text-center text-muted">…</p>}
          {error && <p className="mt-4 text-bad">{error}</p>}
        </section>
      )}

      {step > 0 && (
        <button type="button" className="tap mt-6" onClick={() => go(-1)} disabled={pending}>
          <ArrowLeft className="size-4" aria-hidden /> {t("back")}
        </button>
      )}
    </div>
  );
}
