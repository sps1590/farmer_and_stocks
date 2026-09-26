"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getPriceRefreshStatus, requestPriceRefresh } from "@/lib/actions/prices";
import { useI18n } from "./I18nProvider";
import { fmtNum } from "@/lib/i18n";

type Status = Awaited<ReturnType<typeof getPriceRefreshStatus>>;

/**
 * "Update today's price": starts (or joins) the shared background scrape and
 * polls until it finishes, then refreshes the page with the new prices.
 */
export function UpdatePricesButton({ initial }: { initial: Status }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initial);
  const [note, setNote] = useState<"update_limited" | "update_fresh" | "update_failed" | null>(null);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const running = status.state === "running";

  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(async () => {
      const s = await getPriceRefreshStatus();
      setStatus(s);
      if (s.state !== "running") {
        if (s.state === "failed") setNote("update_failed");
        router.refresh();
      }
    }, 4000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running, router]);

  function update() {
    setNote(null);
    start(async () => {
      const r = await requestPriceRefresh();
      setStatus(r);
      if (r.limited) setNote("update_limited");
      else if (!r.started && r.state === "done") setNote("update_fresh");
    });
  }

  const products = (status.summary ?? []).filter((s) => s.source !== "tcb").reduce((a, s) => a + (s.ok ? s.rows : 0), 0);
  const when = status.finishedAt
    ? new Date(status.finishedAt).toLocaleString(lang === "bn" ? "bn-BD" : "en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div className="card space-y-2 p-3">
      <button type="button" className="btn-primary w-full text-base" disabled={pending || running} onClick={update} aria-live="polite">
        {running ? (
          <>
            <span className="inline-block animate-spin" aria-hidden>
              ⟳
            </span>{" "}
            {t("updating")}
          </>
        ) : (
          <>🔄 {t("update_prices")}</>
        )}
      </button>
      {running && <p className="text-center text-xs text-muted">{t("updating_hint")}</p>}
      {!running && when && (
        <p className="text-center text-xs text-muted">
          {t("updated_at")}: {when}
          {products > 0 && ` · ${fmtNum(lang, products)} ${t("products_count")}`}
        </p>
      )}
      {note && <p className="text-center text-xs text-warn">{t(note)}</p>}
    </div>
  );
}
