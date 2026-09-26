"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "../db";
import { COMMODITIES, COMMODITY_BY_KEY } from "../catalog";
import { DISTRICT_BY_KEY } from "../geo";
import { isValidChain, unionsOf, upazilasOf } from "../admin-geo";
import { getDevice, requireDevice, setDeviceCookie } from "../device";
import { villageName } from "../place";
import { clientKey, rateLimit } from "../rate-limit";

const role = z.enum(["farmer", "trader", "both"]);
const lang = z.enum(["en", "bn"]);
const district = z.string().refine((k) => DISTRICT_BY_KEY.has(k), "unknown district");
// Any number of items (at least one) — traders often track many commodities.
const commodities = z
  .array(z.string().refine((k) => COMMODITY_BY_KEY.has(k), "unknown commodity"))
  .min(1)
  .max(COMMODITIES.length);
const pushes = z.coerce.number().int().min(0).max(3);
const optId = z.number().int().positive().nullable().optional();

const location = z
  .object({ district, upazila: optId, union: optId })
  .refine((l) => isValidChain(l.district, l.upazila, l.union), "invalid location chain");

const onboardingSchema = z.object({ role, lang, location, commodities, pushes });

export type OnboardingInput = z.input<typeof onboardingSchema>;

export async function createDevice(input: OnboardingInput): Promise<{ error?: string }> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  if (await getDevice()) redirect("/today");
  if (!(await rateLimit(`device:${await clientKey()}`, 20, 3600))) return { error: "rate_limited" };

  const id = randomUUID();
  const d = parsed.data;
  const sql = await getDb();
  await sql`
    INSERT INTO devices (id, role, lang, district, upazila_id, union_id, commodities, pushes_per_day)
    VALUES (${id}, ${d.role}, ${d.lang}, ${d.location.district}, ${d.location.upazila ?? null}, ${d.location.union ?? null},
            ${[...new Set(d.commodities)]}, ${d.pushes})
  `;
  await setDeviceCookie(id);
  redirect("/today");
}

/** Pre-onboarding language choice (no device yet). */
export async function setWelcomeLanguage(value: string) {
  const l = lang.safeParse(value);
  if (!l.success) return;
  (await cookies()).set("fs_lang", l.data, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

/** Children of a location level for the tap pickers (public reference data). */
export async function geoChildren(level: "upazila" | "union", parent: string | number) {
  if (level === "upazila") {
    const d = district.safeParse(parent);
    return d.success ? upazilasOf(d.data).map(({ id, en, bn }) => ({ id, en, bn })) : [];
  }
  const id = Number(parent);
  return Number.isInteger(id) ? unionsOf(id).map(({ id, en, bn }) => ({ id, en, bn })) : [];
}

const settingsSchema = z.discriminatedUnion("field", [
  z.object({ field: z.literal("role"), value: role }),
  z.object({ field: z.literal("lang"), value: lang }),
  z.object({ field: z.literal("location"), value: location }),
  z.object({ field: z.literal("commodities"), value: commodities }),
  z.object({ field: z.literal("pushes"), value: pushes }),
]);

export async function updateSetting(input: z.input<typeof settingsSchema>): Promise<{ error?: string }> {
  const device = await requireDevice();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const sql = await getDb();
  const s = parsed.data;
  switch (s.field) {
    case "role":
      await sql`UPDATE devices SET role = ${s.value} WHERE id = ${device.id}`;
      break;
    case "lang":
      await sql`UPDATE devices SET lang = ${s.value} WHERE id = ${device.id}`;
      break;
    case "location":
      await sql`
        UPDATE devices SET district = ${s.value.district}, upazila_id = ${s.value.upazila ?? null}, union_id = ${s.value.union ?? null}
        WHERE id = ${device.id}
      `;
      break;
    case "commodities":
      await sql`UPDATE devices SET commodities = ${[...new Set(s.value)]} WHERE id = ${device.id}`;
      break;
    case "pushes":
      await sql`UPDATE devices SET pushes_per_day = ${s.value} WHERE id = ${device.id}`;
      break;
  }
  revalidatePath("/", "layout");
  return {};
}

// Bangladesh bounding box (with a small margin).
const gpsSchema = z.object({
  lat: z.number().min(20.3).max(26.8),
  lon: z.number().min(87.9).max(92.8),
});

/** One-tap GPS fix: store coordinates (~100 m precision) and the nearest village name. */
export async function saveGpsLocation(input: z.input<typeof gpsSchema>): Promise<{ error?: string; place?: string | null }> {
  const device = await requireDevice();
  const parsed = gpsSchema.safeParse(input);
  if (!parsed.success) return { error: "outside_bd" };
  if (!(await rateLimit(`gps:${device.id}`, 10, 3600))) return { error: "rate_limited" };
  const lat = Math.round(parsed.data.lat * 1000) / 1000;
  const lon = Math.round(parsed.data.lon * 1000) / 1000;
  const place = await villageName(lat, lon, device.lang);
  const sql = await getDb();
  await sql`UPDATE devices SET lat = ${lat}, lon = ${lon}, place_name = ${place} WHERE id = ${device.id}`;
  revalidatePath("/", "layout");
  return { place };
}

export async function clearGpsLocation(): Promise<void> {
  const device = await requireDevice();
  const sql = await getDb();
  await sql`UPDATE devices SET lat = NULL, lon = NULL, place_name = NULL WHERE id = ${device.id}`;
  revalidatePath("/", "layout");
}

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000).startsWith("https://"),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
});

export async function savePushSubscription(sub: unknown): Promise<{ error?: string }> {
  const device = await requireDevice();
  const parsed = subscriptionSchema.safeParse(sub);
  if (!parsed.success) return { error: "invalid" };
  const sql = await getDb();
  await sql`
    UPDATE devices SET push_subscription = ${JSON.stringify(parsed.data)}::jsonb,
      pushes_per_day = CASE WHEN pushes_per_day = 0 THEN 2 ELSE pushes_per_day END
    WHERE id = ${device.id}
  `;
  revalidatePath("/", "layout");
  return {};
}

export async function removePushSubscription(): Promise<void> {
  const device = await requireDevice();
  const sql = await getDb();
  await sql`UPDATE devices SET push_subscription = NULL WHERE id = ${device.id}`;
  revalidatePath("/", "layout");
}

/** "Start over" on this phone: forget the device cookie (the anonymous reports stay). */
export async function startOver(): Promise<void> {
  await requireDevice();
  (await cookies()).delete("fs_device");
  redirect("/welcome");
}
