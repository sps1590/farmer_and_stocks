"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { geoChildren } from "@/lib/actions/device";
import type { DictKey, Lang } from "@/lib/i18n";

type Named = { key: string; name_en: string; name_bn: string };
type Unit = { id: number; en: string; bn: string };

export type LocationValue = { division: string | null; district: string | null; upazila: number | null; union: number | null };

type Props = {
  lang: Lang;
  t: (k: DictKey) => string;
  divisions: Named[];
  districts: (Named & { division: string })[];
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  /** Called once the user has picked as deep as they want (union chosen or skipped). */
  onDone?: (v: LocationValue) => void;
};

/**
 * Tap-only drill-down: division → district → upazila/thana → union.
 * Upazila and union lists are loaded on demand from the server.
 */
export function LocationPicker({ lang, t, divisions, districts, value, onChange, onDone }: Props) {
  const [upazilas, setUpazilas] = useState<Unit[]>([]);
  const [unions, setUnions] = useState<Unit[]>([]);
  const [loading, start] = useTransition();
  const name = (x: { en?: string; bn?: string; name_en?: string; name_bn?: string }) =>
    (lang === "bn" ? (x.bn ?? x.name_bn) : (x.en ?? x.name_en)) ?? "";

  useEffect(() => {
    if (!value.district) return;
    start(async () => setUpazilas(await geoChildren("upazila", value.district!)));
  }, [value.district]);

  useEffect(() => {
    if (!value.upazila) return;
    start(async () => setUnions(await geoChildren("union", value.upazila!)));
  }, [value.upazila]);

  const level = !value.division ? "division" : !value.district ? "district" : !value.upazila ? "upazila" : !value.union ? "union" : "done";

  const crumbs: { label: string; reset: LocationValue }[] = [];
  if (value.division) {
    const d = divisions.find((x) => x.key === value.division);
    crumbs.push({ label: d ? name(d) : value.division, reset: { division: null, district: null, upazila: null, union: null } });
  }
  if (value.district) {
    const d = districts.find((x) => x.key === value.district);
    crumbs.push({ label: d ? name(d) : value.district, reset: { ...value, district: null, upazila: null, union: null } });
  }
  if (value.upazila) {
    const u = upazilas.find((x) => x.id === value.upazila);
    crumbs.push({ label: u ? name(u) : "…", reset: { ...value, upazila: null, union: null } });
  }
  if (value.union) {
    const u = unions.find((x) => x.id === value.union);
    crumbs.push({ label: u ? name(u) : "…", reset: { ...value, union: null } });
  }

  const grid = "grid grid-cols-2 gap-2 sm:grid-cols-3";

  return (
    <div className="space-y-3" aria-busy={loading}>
      {crumbs.length > 0 && (
        <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="location">
          {crumbs.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              {i > 0 && <span className="text-muted">›</span>}
              <button type="button" className="chip text-foreground" onClick={() => onChange(c.reset)}>
                {c.label}
              </button>
            </span>
          ))}
        </nav>
      )}

      {level === "division" && (
        <div className={grid}>
          {divisions.map((d) => (
            <button key={d.key} type="button" className="tap" onClick={() => onChange({ division: d.key, district: null, upazila: null, union: null })}>
              {name(d)}
            </button>
          ))}
        </div>
      )}

      {level === "district" && (
        <div className={grid}>
          {districts
            .filter((d) => d.division === value.division)
            .map((d) => (
              <button key={d.key} type="button" className="tap" onClick={() => onChange({ ...value, district: d.key, upazila: null, union: null })}>
                {name(d)}
              </button>
            ))}
        </div>
      )}

      {level === "upazila" && (
        <>
          <p className="text-sm font-semibold">{t("choose_upazila")}</p>
          {loading && !upazilas.length ? (
            <p className="text-sm text-muted">…</p>
          ) : (
            <div className={grid}>
              {upazilas.map((u) => (
                <button key={u.id} type="button" className="tap text-sm" onClick={() => onChange({ ...value, upazila: u.id, union: null })}>
                  {name(u)}
                </button>
              ))}
            </div>
          )}
          {onDone && (
            <button type="button" className="tap w-full text-sm text-muted" onClick={() => onDone(value)}>
              {t("skip")} <ArrowRight className="size-4" aria-hidden />
            </button>
          )}
        </>
      )}

      {level === "union" && (
        <>
          <p className="text-sm font-semibold">{t("choose_union")}</p>
          {loading && !unions.length ? (
            <p className="text-sm text-muted">…</p>
          ) : (
            <div className={grid}>
              {unions.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="tap text-sm"
                  onClick={() => {
                    const v = { ...value, union: u.id };
                    onChange(v);
                    onDone?.(v);
                  }}
                >
                  {name(u)}
                </button>
              ))}
            </div>
          )}
          {onDone && (
            <button type="button" className="tap w-full text-sm text-muted" onClick={() => onDone(value)}>
              {t("skip")} <ArrowRight className="size-4" aria-hidden />
            </button>
          )}
        </>
      )}
    </div>
  );
}
