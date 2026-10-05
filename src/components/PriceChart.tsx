"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "./I18nProvider";
import { fmtTaka, fmtYm } from "@/lib/i18n";

export type ChartPoint = { m: string; v?: number; point?: number; lo?: number; hi?: number };

const H = 200;
const PAD = { l: 48, r: 10, t: 12, b: 26 };

/**
 * One series: observed monthly price (solid line) continuing into the
 * forecast (dashed) with its 95% range as a light band. Hover/tap shows a
 * crosshair tooltip; a table view is available for screen readers.
 */
export function PriceChart({ history, forecast, label }: { history: { m: string; v: number }[]; forecast: { m: string; point: number; lo: number; hi: number }[]; label: string }) {
  const { t, lang } = useI18n();
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLElement>(null);
  // Draw at the container's real pixel width so text stays 11px on phones.
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pts: ChartPoint[] = useMemo(() => [...history.map((h) => ({ m: h.m, v: h.v })), ...forecast.map((f) => ({ m: f.m, point: f.point, lo: f.lo, hi: f.hi }))], [history, forecast]);

  const { x, y, yTicks } = useMemo(() => {
    const vals = pts.flatMap((p) => [p.v, p.lo, p.hi, p.point].filter((n): n is number => n !== undefined));
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    const pad = (hi - lo) * 0.08 || hi * 0.1 || 1;
    lo = Math.max(0, lo - pad);
    hi = hi + pad;
    const n = Math.max(pts.length - 1, 1);
    const x = (i: number) => PAD.l + (i / n) * (W - PAD.l - PAD.r);
    const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
    const step = niceStep((hi - lo) / 4);
    const yTicks: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) yTicks.push(v);
    return { x, y, yTicks };
  }, [pts, W]);

  if (pts.length < 2) return null;

  const hStart = 0;
  const fStart = history.length; // index of first forecast point
  const histPath = history.map((h, i) => `${i === 0 ? "M" : "L"}${x(hStart + i).toFixed(1)},${y(h.v).toFixed(1)}`).join("");
  const lastHist = history.at(-1);
  const fcPath = forecast.length && lastHist
    ? `M${x(fStart - 1).toFixed(1)},${y(lastHist.v).toFixed(1)}` + forecast.map((f, i) => `L${x(fStart + i).toFixed(1)},${y(f.point).toFixed(1)}`).join("")
    : "";
  const band = forecast.length && lastHist
    ? `M${x(fStart - 1)},${y(lastHist.v)}` +
      forecast.map((f, i) => `L${x(fStart + i)},${y(f.hi)}`).join("") +
      [...forecast].reverse().map((f, i) => `L${x(fStart + forecast.length - 1 - i)},${y(f.lo)}`).join("") +
      "Z"
    : "";

  // Label roughly every 6th month on the x axis.
  const every = Math.max(1, Math.ceil(pts.length / Math.max(2, Math.floor((W - PAD.l) / 80))));

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const n = pts.length - 1;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * n);
    setHover(Math.min(n, Math.max(0, i)));
  }

  const hp = hover !== null ? pts[hover] : null;

  return (
    <figure ref={boxRef} className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block max-w-full touch-pan-y select-none"
        role="img"
        aria-label={label}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" strokeWidth={1} />
            <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">
              {fmtTaka(lang, v)}
            </text>
          </g>
        ))}
        {pts.map((p, i) =>
          i % every === 0 ? (
            <text key={p.m} x={x(i)} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--muted)">
              {fmtYm(lang, p.m)}
            </text>
          ) : null,
        )}
        {band && <path d={band} fill="var(--chart-band)" stroke="none" className="fade-late" />}
        <path d={histPath} pathLength={1} className="draw" fill="none" stroke="var(--chart-line)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {fcPath && <path d={fcPath} fill="none" stroke="var(--chart-line)" strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" className="fade-late" />}
        {lastHist && <circle cx={x(fStart - 1)} cy={y(lastHist.v)} r={4} fill="var(--chart-line)" stroke="var(--surface)" strokeWidth={2} />}
        {hover !== null && hp && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--muted)" strokeWidth={1} />
            <circle cx={x(hover)} cy={y(hp.v ?? hp.point!)} r={4.5} fill="var(--chart-line)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hover !== null && hp && (
        <div
          className="pointer-events-none absolute top-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-sm"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > pts.length / 2 ? "-105%" : "5%"})` }}
        >
          <p className="font-semibold">{fmtYm(lang, hp.m)}</p>
          {hp.v !== undefined ? (
            <p className="num">
              {t("history")}: {fmtTaka(lang, hp.v)}
            </p>
          ) : (
            <>
              <p className="num">
                {t("forecast")}: {fmtTaka(lang, hp.point!)}
              </p>
              <p className="num text-muted">
                {t("forecast_range")}: {fmtTaka(lang, hp.lo!)}–{fmtTaka(lang, hp.hi!)}
              </p>
            </>
          )}
        </div>
      )}
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden><line x1="0" x2="18" y1="3" y2="3" stroke="var(--chart-line)" strokeWidth="2" /></svg>
          {t("history")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden><line x1="0" x2="18" y1="3" y2="3" stroke="var(--chart-line)" strokeWidth="2" strokeDasharray="5 4" /></svg>
          {t("forecast")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-4 rounded-sm" style={{ background: "var(--chart-band)" }} />
          {t("forecast_range")}
        </span>
      </figcaption>
      <details className="mt-1 text-xs">
        <summary className="cursor-pointer text-muted">{t("show_table")}</summary>
        <table className="num mt-2 w-full text-left">
          <thead>
            <tr className="text-muted">
              <th className="py-1 font-semibold">{t("month_col")}</th>
              <th className="font-semibold">{t("price_col")}</th>
              <th className="font-semibold">{t("low_col")}</th>
              <th className="font-semibold">{t("high_col")}</th>
            </tr>
          </thead>
          <tbody>
            {pts.map((p) => (
              <tr key={p.m} className="border-t border-border">
                <td className="py-1">{fmtYm(lang, p.m)}</td>
                <td>{fmtTaka(lang, p.v ?? p.point!)}{p.v === undefined && "*"}</td>
                <td>{p.lo !== undefined ? fmtTaka(lang, p.lo) : ""}</td>
                <td>{p.hi !== undefined ? fmtTaka(lang, p.hi) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
}
