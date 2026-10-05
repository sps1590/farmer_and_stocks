"use client";

import { Bell, BellRing } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { savePushSubscription } from "@/lib/actions/device";
import { useI18n } from "./I18nProvider";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "loading" | "unsupported" | "denied" | "off" | "on";

export function PushManager({ hasPush, vapidKey }: { hasPush: boolean; vapidKey: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<State>("loading");
  const [isIos, setIsIos] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && Boolean(vapidKey);
    let next: State;
    if (!supported) next = "unsupported";
    else if (Notification.permission === "denied") next = "denied";
    else next = hasPush && Notification.permission === "granted" ? "on" : "off";
    // Detecting browser capabilities is only possible after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsIos(ios);
    setState(next);
    if (supported) {
      // Some embedded/private browsers refuse service workers even when the API exists.
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => setState("unsupported"));
    }
  }, [hasPush, vapidKey]);

  function enable() {
    start(async () => {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) }));
      const r = await savePushSubscription(JSON.parse(JSON.stringify(sub)));
      setState(r.error ? "off" : "on");
    });
  }

  if (state === "loading" || state === "on") {
    return state === "on" ? <p className="flex items-center justify-center gap-1.5 text-sm text-muted">
        <BellRing className="size-4" aria-hidden /> {t("push_on")}
      </p> : null;
  }

  return (
    <section className="card p-4">
      <p className="flex items-center gap-2 font-bold">
        <Bell className="size-5 text-primary" aria-hidden /> {t("enable_push")}
      </p>
      {state === "off" && (
        <>
          <p className="mt-1 text-sm text-muted">{t("enable_push_body")}</p>
          <button type="button" className="btn-primary mt-3 w-full" disabled={pending} onClick={enable}>
            {t("enable_push")}
          </button>
        </>
      )}
      {state === "unsupported" && <p className="mt-1 text-sm text-muted">{isIos ? t("install_hint_ios") : t("push_unsupported")}</p>}
      {state === "denied" && <p className="mt-1 text-sm text-muted">{t("push_denied")}</p>}
    </section>
  );
}
