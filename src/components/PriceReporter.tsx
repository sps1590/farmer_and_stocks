"use client";

import { useState, useTransition } from "react";
import { submitPrice } from "@/lib/actions/reports";
import { useI18n } from "./I18nProvider";
import { fmtTaka, type DictKey } from "@/lib/i18n";

type Props = {
  commodity: string;
  name: string;
  icon: string;
  unit: string;
  reference: number;
  source: string;
  reported: Partial<Record<"wholesale" | "retail", number>>;
};

function stepFor(ref: number) {
  if (ref < 20) return 0.5;
  if (ref < 100) return 1;
  if (ref < 500) return 5;
  if (ref < 2000) return 10;
  return 50;
}

/** Tap-only price entry: centred on the known price, adjust with ± or the slider. */
export function PriceReporter({ commodity, name, icon, unit, reference, source, reported }: Props) {
  const { t, lang } = useI18n();
  const [type, setType] = useState<"retail" | "wholesale">("retail");
  const base = type === "wholesale" ? reference * 0.85 : reference;
  const step = stepFor(base);
  const snap = (v: number) => Math.max(step, Math.round(v / step) * step);
  const [price, setPrice] = useState(() => snap(reported.retail ?? base));
  const [saved, setSaved] = useState<Partial<Record<"wholesale" | "retail", number>>>(reported);
  const [note, setNote] = useState<"saved" | "flagged" | "error" | null>(null);
  const [pending, start] = useTransition();

  const min = snap(base * 0.4);
  const max = snap(base * 2.5);

  function switchType(next: "retail" | "wholesale") {
    setType(next);
    const b = next === "wholesale" ? reference * 0.85 : reference;
    setPrice(Math.max(stepFor(b), Math.round((saved[next] ?? b) / stepFor(b)) * stepFor(b)));
    setNote(null);
  }

  function save() {
    start(async () => {
      const r = await submitPrice({ commodity, priceType: type, price });
      if (r.error) return setNote("error");
      setSaved((s) => ({ ...s, [type]: price }));
      setNote(r.flagged ? "flagged" : "saved");
    });
  }

  const isSaved = saved[type] === price;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold">
          <span aria-hidden>{icon}</span> {name}
        </p>
        <div className="flex gap-1" role="group">
          {(["retail", "wholesale"] as const).map((k) => (
            <button key={k} type="button" className="tap min-h-9 px-2.5 text-xs" aria-pressed={type === k} onClick={() => switchType(k)}>
              {t(k)}
              {saved[k] !== undefined && " ✓"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button type="button" className="tap h-12 w-12 text-2xl" aria-label="−" onClick={() => setPrice((p) => Math.max(min, snap(p - step)))}>
          −
        </button>
        <p className="num flex-1 text-center text-3xl font-bold" aria-live="polite">
          {fmtTaka(lang, price)}
          <span className="block text-xs font-normal text-muted">
            {t("per")} {unit}
          </span>
        </p>
        <button type="button" className="tap h-12 w-12 text-2xl" aria-label="+" onClick={() => setPrice((p) => Math.min(max, snap(p + step)))}>
          +
        </button>
      </div>
      <input
        type="range"
        className="slider mt-1"
        min={min}
        max={max}
        step={step}
        value={price}
        aria-label={name}
        onChange={(e) => setPrice(Number(e.target.value))}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted">
          {t("price_from")}: {t(source as DictKey)}
        </span>
        <button type="button" className="btn-primary min-h-11" disabled={pending || isSaved} onClick={save}>
          {isSaved ? `✓ ${t("saved")}` : `✓ ${t("looks_right")}`}
        </button>
      </div>
      {note === "flagged" && <p className="mt-2 text-sm text-warn">{t("flagged_note")}</p>}
      {note === "error" && <p className="mt-2 text-sm text-bad">{t("error_generic")}</p>}
    </div>
  );
}
