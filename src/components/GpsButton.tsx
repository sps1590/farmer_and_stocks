"use client";

import { Check, LocateFixed, MapPin } from "lucide-react";
import { useState, useTransition } from "react";
import { clearGpsLocation, saveGpsLocation } from "@/lib/actions/device";
import { fmtNum, type DictKey, type Lang } from "@/lib/i18n";

/** One tap: read the phone's GPS, save it (~100 m precision) and show the village name. */
export function GpsButton({
  lang,
  t,
  current,
}: {
  lang: Lang;
  t: (k: DictKey) => string;
  current: { lat: number | null; lon: number | null; place: string | null };
}) {
  const [state, setState] = useState<{ lat: number | null; lon: number | null; place: string | null }>({ ...current });
  const [msg, setMsg] = useState<DictKey | null>(null);
  const [pending, start] = useTransition();

  function locate() {
    if (!("geolocation" in navigator)) return setMsg("gps_denied");
    setMsg("gps_saving");
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        start(async () => {
          const r = await saveGpsLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          if (r.error) return setMsg(r.error === "outside_bd" ? "gps_outside" : "error_generic");
          setState({ lat: Math.round(pos.coords.latitude * 1000) / 1000, lon: Math.round(pos.coords.longitude * 1000) / 1000, place: r.place ?? null });
          setMsg("gps_saved");
        }),
      () => setMsg("gps_denied"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  return (
    <div className="space-y-2">
      {state.lat !== null && state.lon !== null && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
          <span>
            <MapPin className="mr-1 inline size-4 text-primary" aria-hidden />
            <b>{state.place ?? t("village_gps")}</b>
            <span className="num block text-xs text-muted">
              {fmtNum(lang, state.lat, 3)}°N, {fmtNum(lang, state.lon, 3)}°E
            </span>
          </span>
          <button
            type="button"
            className="tap min-h-11 px-3 text-xs"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await clearGpsLocation();
                setState({ lat: null, lon: null, place: null });
                setMsg(null);
              })
            }
          >
            {t("gps_clear")}
          </button>
        </div>
      )}
      <button type="button" className="tap w-full" disabled={pending || msg === "gps_saving"} onClick={locate}>
        <LocateFixed className="size-5" aria-hidden /> {t("use_gps")}
      </button>
      {msg && msg !== "gps_saved" && <p className={`text-sm ${msg === "gps_saving" ? "text-muted" : "text-bad"}`}>{t(msg)}</p>}
      {msg === "gps_saved" && <p className="flex items-center gap-1 text-sm text-good">
          <Check className="size-4" aria-hidden /> {t("gps_saved")}
        </p>}
    </div>
  );
}
