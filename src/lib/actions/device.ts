"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "../db";
import { COMMODITY_BY_KEY } from "../catalog";
import { DISTRICT_BY_KEY } from "../geo";
import { getDevice, requireDevice, setDeviceCookie } from "../device";
import { clientKey, rateLimit } from "../rate-limit";

const role = z.enum(["farmer", "trader", "both"]);
const lang = z.enum(["en", "bn"]);
const district = z.string().refine((k) => DISTRICT_BY_KEY.has(k), "unknown district");
const commodities = z
  .array(z.string().refine((k) => COMMODITY_BY_KEY.has(k), "unknown commodity"))
  .min(1)
  .max(12);
const pushes = z.coerce.number().int().min(0).max(3);

const onboardingSchema = z.object({ role, lang, district, commodities, pushes });

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
    INSERT INTO devices (id, role, lang, district, commodities, pushes_per_day)
    VALUES (${id}, ${d.role}, ${d.lang}, ${d.district}, ${[...new Set(d.commodities)]}, ${d.pushes})
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

const settingsSchema = z.discriminatedUnion("field", [
  z.object({ field: z.literal("role"), value: role }),
  z.object({ field: z.literal("lang"), value: lang }),
  z.object({ field: z.literal("district"), value: district }),
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
    case "district":
      await sql`UPDATE devices SET district = ${s.value} WHERE id = ${device.id}`;
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
