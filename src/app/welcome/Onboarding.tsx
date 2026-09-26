"use client";

import { useState, useTransition } from "react";
import type { DictKey, Lang } from "@/lib/i18n";
import { createDevice, setWelcomeLanguage } from "@/lib/actions/device";

type Named = { key: string; name_en: string; name_bn: string };

type Props = {
  initialLang: Lang;
  dicts: Record<Lang, Record<DictKey, string>>;
  divisions: Named[];
  districts: (Named & { division: string })[];
  commodities: (Named & { icon: string })[];
};

const STEPS = ["lang", "role", "division", "district", "commodities", "pushes"] as const;

export function Onboarding({ initialLang, dicts, divisions, districts, commodities }: Props) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<"farmer" | "trader" | "both" | null>(null);
  const [division, setDivision] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const t = (k: DictKey) => dicts[lang][k];
  const name = (x: Named) => (lang === "bn" ? x.name_bn : x.name_en);
  const go = (n: number) => setStep((s) => Math.min(STEPS.length - 1, Math.max(0, s + n)));

  function finish(pushes: number) {
    if (!role || !district || !picked.length) return;
    setError(null);
    start(async () => {
      const r = await createDevice({ role, lang, district, commodities: picked, pushes });
      if (r?.error) setError(r.error === "rate_limited" ? t("error_rate_limited") : t("error_generic"));
    });
  }

  const current = STEPS[step];

  return (
    <div>
      <header className="mb-5">
        <p className="text-sm font-semibold text-primary">🌾 {t("app_name")}</p>
        <div className="mt-3 flex gap-1" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
      </header>

      {current === "lang" && (
        <section>
          <h1 className="text-2xl font-bold">{t("welcome_title")}</h1>
          <p className="mt-2 text-muted">{t("welcome_body")}</p>
          <h2 className="mt-6 mb-3 font-semibold">{t("choose_language")}</h2>
          <div className="grid grid-cols-2 gap-3">
            {(["bn", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                className="tap text-lg"
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
        <section>
          <h1 className="mb-4 text-2xl font-bold">{t("who_are_you")}</h1>
          <div className="grid gap-3">
            {([
              ["farmer", "🧑‍🌾", "role_farmer"],
              ["trader", "📦", "role_trader"],
              ["both", "🤝", "role_both"],
            ] as const).map(([r, icon, key]) => (
              <button
                key={r}
                type="button"
                className="tap justify-start text-lg"
                aria-pressed={role === r}
                onClick={() => {
                  setRole(r);
                  go(1);
                }}
              >
                <span aria-hidden className="text-2xl">{icon}</span> {t(key)}
              </button>
            ))}
          </div>
        </section>
      )}

      {current === "division" && (
        <section>
          <h1 className="mb-4 text-2xl font-bold">{t("choose_division")}</h1>
          <div className="grid grid-cols-2 gap-3">
            {divisions.map((d) => (
              <button
                key={d.key}
                type="button"
                className="tap"
                aria-pressed={division === d.key}
                onClick={() => {
                  setDivision(d.key);
                  setDistrict(null);
                  go(1);
                }}
              >
                {name(d)}
              </button>
            ))}
          </div>
        </section>
      )}

      {current === "district" && (
        <section>
          <h1 className="mb-4 text-2xl font-bold">{t("choose_district")}</h1>
          <div className="grid grid-cols-2 gap-3">
            {districts
              .filter((d) => d.division === division)
              .map((d) => (
                <button
                  key={d.key}
                  type="button"
                  className="tap"
                  aria-pressed={district === d.key}
                  onClick={() => {
                    setDistrict(d.key);
                    go(1);
                  }}
                >
                  {name(d)}
                </button>
              ))}
          </div>
        </section>
      )}

      {current === "commodities" && (
        <section>
          <h1 className="text-2xl font-bold">{t("choose_commodities")}</h1>
          <p className="mb-4 text-sm text-muted">{t("choose_commodities_hint")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {commodities.map((c) => {
              const on = picked.includes(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  className="tap justify-start text-left text-sm"
                  aria-pressed={on}
                  disabled={!on && picked.length >= 12}
                  onClick={() => setPicked((p) => (on ? p.filter((k) => k !== c.key) : [...p, c.key]))}
                >
                  <span aria-hidden className="text-xl">{c.icon}</span>
                  {name(c)}
                </button>
              );
            })}
          </div>
          <button type="button" className="btn-primary mt-5 w-full" disabled={!picked.length} onClick={() => go(1)}>
            {t("next")}
          </button>
        </section>
      )}

      {current === "pushes" && (
        <section>
          <h1 className="text-2xl font-bold">{t("how_many_reminders")}</h1>
          <p className="mb-4 text-muted">{t("reminders_hint")}</p>
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((n) => (
              <button key={n} type="button" className="tap text-xl" disabled={pending} onClick={() => finish(n)}>
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
          ← {t("back")}
        </button>
      )}
    </div>
  );
}
