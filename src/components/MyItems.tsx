"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "./I18nProvider";
import { PriceReporter } from "./PriceReporter";
import { fmtPct, fmtTaka } from "@/lib/i18n";
import type { Flag } from "@/lib/recommend";

export type MyItem = {
  key: string;
  name: string;
  icon: string;
  unit: string;
  price: number | null;
  change: number | null;
  flag: Flag | null;
  reference: number;
  source: string;
  reported: Partial<Record<"wholesale" | "retail", number>>;
};

const FLAG_ICON: Record<Flag, string> = { green: "▲", orange: "■", red: "▼" };
const FLAG_LABEL = { green: "flag_green", orange: "flag_orange", red: "flag_red" } as const;

/** Compact list of the user's items; tapping a row opens the one-tap price report. */
export function MyItems({ items }: { items: MyItem[] }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <ul className="card divide-y divide-border overflow-hidden">
      {items.map((it) => (
        <li key={it.key} className={it.flag ? `flag-bar-${it.flag}` : ""}>
          <button type="button" className="row-tap" aria-expanded={open === it.key} onClick={() => setOpen(open === it.key ? null : it.key)}>
            <span aria-hidden className="text-2xl">
              {it.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{it.name}</span>
              <span className="block text-xs text-muted">
                {Object.keys(it.reported).length ? `✓ ${t("saved")}` : t("tap_to_report")}
              </span>
            </span>
            <span className="text-right">
              <span className="num block font-extrabold">
                {it.price !== null ? fmtTaka(lang, it.price) : "–"}
                <span className="text-xs font-normal text-muted">/{it.unit}</span>
              </span>
              {it.flag && (
                <span className={`flag-${it.flag} num mt-0.5 inline-flex items-center gap-1 rounded-full px-1.5 text-[11px] font-bold`}>
                  <span aria-hidden>{FLAG_ICON[it.flag]}</span>
                  <span className="sr-only">{t(FLAG_LABEL[it.flag])}</span>
                  {it.change !== null ? fmtPct(lang, it.change, true) : ""}
                </span>
              )}
            </span>
          </button>
          {open === it.key && (
            <div className="space-y-2 bg-surface-2/60 p-3">
              <PriceReporter
                commodity={it.key}
                name={it.name}
                icon={it.icon}
                unit={it.unit}
                reference={it.reference}
                source={it.source}
                reported={it.reported}
              />
              <Link href={`/market/${it.key}`} className="block text-center text-sm font-semibold text-primary">
                {t("details")} →
              </Link>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
