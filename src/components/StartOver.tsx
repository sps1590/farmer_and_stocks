"use client";

import { RotateCcw } from "lucide-react";
import { useState, useTransition } from "react";
import { startOver } from "@/lib/actions/device";
import { useI18n } from "./I18nProvider";

/** Two taps (ask, then confirm) so it can't happen by accident. */
export function StartOver() {
  const { t } = useI18n();
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  if (!asking) {
    return (
      <button type="button" className="tap w-full text-sm text-muted" onClick={() => setAsking(true)}>
        <RotateCcw className="size-4" aria-hidden /> {t("start_over")}
      </button>
    );
  }
  return (
    <div className="card space-y-2 p-3 text-sm">
      <p>{t("start_over_confirm")}</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="tap" onClick={() => setAsking(false)}>
          {t("back")}
        </button>
        <button type="button" className="tap border-bad text-bad" disabled={pending} onClick={() => start(() => startOver())}>
          <RotateCcw className="size-4" aria-hidden /> {t("start_over")}
        </button>
      </div>
    </div>
  );
}
