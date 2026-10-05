"use client";

import { useI18n } from "./I18nProvider";

/**
 * The loading indicator: a crop that sprouts from the soil, puts out leaves
 * and ripens, then starts again. Pure CSS (see `.crop-*` in globals.css), so
 * it plays in streamed HTML before any script loads. With reduced motion the
 * fully grown plant is shown still.
 */
export function CropLoader({ delayed = false }: { delayed?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="pointer-events-none fixed inset-0 z-30 grid place-items-center" role="status" aria-live="polite">
      <div className={`crop-badge flex flex-col items-center gap-1 px-7 pb-4 pt-5 ${delayed ? "crop-badge-delayed" : ""}`}>
        <svg viewBox="0 0 96 96" width={88} height={88} aria-hidden>
          <path d="M16 84 Q48 70 80 84 Z" fill="var(--border-strong)" />
          <g className="crop-plant">
            <path className="crop-stem" d="M48 79 C47 66 49 52 48 28" pathLength={1} fill="none" stroke="var(--primary)" strokeWidth={4} strokeLinecap="round" />
            <path className="crop-leaf crop-leaf-1" d="M48 66 C56 66 64 60 66 52 C57 52 49 57 48 66 Z" fill="var(--primary)" />
            <path className="crop-leaf crop-leaf-2" d="M48 56 C40 56 32 50 30 42 C39 42 47 47 48 56 Z" fill="var(--primary-2)" />
            <path className="crop-leaf crop-leaf-3" d="M48 46 C55 46 61 41 62 34 C55 34 49 39 48 46 Z" fill="var(--primary)" />
            <path className="crop-leaf crop-leaf-4" d="M48 39 C42 39 37 35 36 29 C42 29 47 33 48 39 Z" fill="var(--primary-2)" />
            <g className="crop-ear" fill="var(--warn)">
              <ellipse cx={48} cy={19} rx={4} ry={8} />
              <ellipse cx={42} cy={23} rx={3} ry={6} transform="rotate(-28 42 23)" />
              <ellipse cx={54} cy={23} rx={3} ry={6} transform="rotate(28 54 23)" />
            </g>
          </g>
        </svg>
        <span className="text-sm font-semibold text-muted">{t("loading")}</span>
      </div>
    </div>
  );
}
