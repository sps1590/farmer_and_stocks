// "Today's brief": turns the day's data into at most three plain sentences
// and one next action. Pure logic (no I/O) so the rules are unit-tested.

import type { Flag } from "./recommend.ts";

export type BriefKey =
  | "brief_storm"
  | "brief_rain_likely"
  | "brief_rain_possible"
  | "brief_hot"
  | "brief_dry"
  | "brief_up"
  | "brief_down"
  | "brief_plant"
  | "brief_outlook_up"
  | "brief_outlook_down";

export type BriefIcon = "storm" | "rain" | "heat" | "sun" | "drizzle" | "up" | "down" | "plant" | "gain" | "loss";

export type BriefLine = {
  icon: BriefIcon;
  key: BriefKey;
  /** Raw values; the caller formats numbers for the user's language. */
  vars: { name?: string; pct?: number; temp?: number };
  tone: "good" | "warn" | "bad" | "info";
  href?: string;
};

export type BriefAction = { key: "act_checkin" | "act_update" | "act_plan" | "act_market"; href: string };

export type BriefInput = {
  weather: { code: number | null; rainChance: number | null; tmax: number | null } | null;
  /** Biggest 7-day price move among the user's items. */
  mover: { key: string; name: string; change: number } | null;
  /** Best crop to plant in the next 3 months (farmers). */
  crop: { name: string; flag: Flag } | null;
  /** Strongest flagged 3-month outlook (traders). */
  outlook: { key: string; name: string; change: number; flag: Flag } | null;
  checkedIn: boolean;
  pricesFresh: boolean;
};

function weatherLine(w: NonNullable<BriefInput["weather"]>): BriefLine {
  const rain = w.rainChance ?? 0;
  if ((w.code ?? 0) >= 95) return { icon: "storm", key: "brief_storm", vars: {}, tone: "bad" };
  if (rain >= 70) return { icon: "rain", key: "brief_rain_likely", vars: { pct: rain / 100 }, tone: "warn" };
  if ((w.tmax ?? 0) >= 36) return { icon: "heat", key: "brief_hot", vars: { temp: w.tmax! }, tone: "warn" };
  if (rain <= 20) return { icon: "sun", key: "brief_dry", vars: {}, tone: "good" };
  return { icon: "drizzle", key: "brief_rain_possible", vars: { pct: rain / 100 }, tone: "info" };
}

export function buildBrief(i: BriefInput): { lines: BriefLine[]; action: BriefAction } {
  const lines: BriefLine[] = [];
  if (i.weather) lines.push(weatherLine(i.weather));

  if (i.mover && Math.abs(i.mover.change) >= 0.02) {
    const up = i.mover.change > 0;
    lines.push({
      icon: up ? "up" : "down",
      key: up ? "brief_up" : "brief_down",
      vars: { name: i.mover.name, pct: Math.abs(i.mover.change) },
      tone: "info",
      href: `/market/${i.mover.key}`,
    });
  }

  if (i.crop && i.crop.flag !== "red") {
    lines.push({ icon: "plant", key: "brief_plant", vars: { name: i.crop.name }, tone: i.crop.flag === "green" ? "good" : "info", href: "/farmer" });
  }
  if (i.outlook && i.outlook.flag !== "orange") {
    const up = i.outlook.flag === "green";
    lines.push({
      icon: up ? "gain" : "loss",
      key: up ? "brief_outlook_up" : "brief_outlook_down",
      vars: { name: i.outlook.name, pct: Math.abs(i.outlook.change) },
      tone: up ? "good" : "bad",
      href: `/market/${i.outlook.key}`,
    });
  }

  // One dominant next action: contribute first, then freshen data, then act on it.
  const action: BriefAction = !i.checkedIn
    ? { key: "act_checkin", href: "#checkin" }
    : !i.pricesFresh
      ? { key: "act_update", href: "#prices" }
      : i.crop
        ? { key: "act_plan", href: "/farmer" }
        : { key: "act_market", href: "/trader" };

  return { lines: lines.slice(0, 3), action };
}
