import type { Flag } from "@/lib/recommend";
import { t, type Lang } from "@/lib/i18n";

const ICON: Record<Flag, string> = { green: "▲", orange: "■", red: "▼" };
const LABEL = { green: "flag_green", orange: "flag_orange", red: "flag_red" } as const;
const HINT = { green: "flag_green_hint", orange: "flag_orange_hint", red: "flag_red_hint" } as const;

/** Traffic-light badge: colour + shape + word, so it never relies on colour alone. */
export function FlagPill({ flag, lang, compact = false }: { flag: Flag; lang: Lang; compact?: boolean }) {
  return (
    <span className={`flag-${flag} inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold`}>
      <span aria-hidden>{ICON[flag]}</span>
      {compact ? <span className="sr-only">{t(lang, LABEL[flag])}</span> : t(lang, LABEL[flag])}
    </span>
  );
}

export function FlagLegend({ lang }: { lang: Lang }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted">
      {(["green", "orange", "red"] as const).map((f) => (
        <li key={f} className="inline-flex items-center gap-1.5">
          <FlagPill flag={f} lang={lang} />
          {t(lang, HINT[f])}
        </li>
      ))}
    </ul>
  );
}
