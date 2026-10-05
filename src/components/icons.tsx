// One icon family for the whole interface (Lucide, 2px stroke).
// Sizes follow the tokens in globals.css: sm 16px (inline with text),
// md 20px (default), lg 24px (navigation / emphasis).
//
// Decorative icons next to visible text are aria-hidden (Lucide's default);
// icons that carry meaning on their own get a label from the caller.

import { createElement } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSun,
  Minus,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import type { Flag } from "@/lib/recommend";

export const ICON_SM = "size-4 shrink-0";
export const ICON_MD = "size-5 shrink-0";
export const ICON_LG = "size-6 shrink-0";

/** WMO weather code -> icon (same thresholds as describeCode in lib/wx.ts). */
export function wxIcon(code: number, isDay = true): LucideIcon {
  if (code >= 95) return CloudLightning;
  if (code >= 80) return CloudRain;
  if (code >= 61) return CloudRain;
  if (code >= 51) return CloudDrizzle;
  if (code >= 45) return CloudFog;
  if (code >= 3) return Cloud;
  if (code >= 1) return isDay ? CloudSun : CloudMoon;
  return isDay ? Sun : Moon;
}

export function WxIcon({ code, isDay = true, className = ICON_MD }: { code: number; isDay?: boolean; className?: string }) {
  // createElement: the icon is picked from a fixed table, not defined during render.
  return createElement(wxIcon(code, isDay), { className, "aria-hidden": true });
}

const FLAG_ICON: Record<Flag, LucideIcon> = { green: ArrowUpRight, orange: Minus, red: ArrowDownRight };

export function FlagIcon({ flag, className = ICON_SM }: { flag: Flag; className?: string }) {
  const I = FLAG_ICON[flag];
  return <I className={className} aria-hidden strokeWidth={2.5} />;
}

/** Direction icon for a signed change (flat within ±0.5%). */
export function TrendIcon({ value, className = ICON_SM }: { value: number; className?: string }) {
  const flag: Flag = Math.abs(value) < 0.005 ? "orange" : value > 0 ? "green" : "red";
  return <FlagIcon flag={flag} className={className} />;
}

/** Uniform tile for a commodity's picture (emoji are product imagery here, not UI icons). */
export function ItemAvatar({ icon, size = "md" }: { icon: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-xl border border-border bg-surface-2 ${size === "lg" ? "size-14 text-3xl" : "size-10 text-xl"}`}
    >
      {icon}
    </span>
  );
}
