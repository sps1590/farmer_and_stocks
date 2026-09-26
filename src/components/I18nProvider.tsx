"use client";

import { createContext, useContext } from "react";
import type { DictKey, Lang } from "@/lib/i18n";

type Ctx = { lang: Lang; d: Record<DictKey, string> };

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ lang, d, children }: Ctx & { children: React.ReactNode }) {
  return <I18nContext.Provider value={{ lang, d }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return { lang: ctx.lang, t: (k: DictKey) => ctx.d[k] };
}
