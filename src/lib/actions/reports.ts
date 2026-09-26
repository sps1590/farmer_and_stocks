"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "../db";
import { COMMODITY_BY_KEY } from "../catalog";
import { requireDevice } from "../device";
import { currentPrices, referencePrice } from "../queries";
import { rateLimit } from "../rate-limit";
import { bdToday } from "../time";

const weatherSchema = z.object({
  slot: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  rain: z.enum(["none", "light", "heavy"]),
  heat: z.number().int().min(1).max(5),
  storm: z.boolean(),
});

export async function submitWeather(input: z.input<typeof weatherSchema>): Promise<{ error?: string }> {
  const device = await requireDevice();
  const parsed = weatherSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const w = parsed.data;
  const sql = await getDb();
  // One answer per device per slot per day; re-submitting just corrects it.
  await sql`
    INSERT INTO weather_reports (device_id, district, report_date, slot, rain, heat, storm)
    VALUES (${device.id}, ${device.district}, ${bdToday()}, ${w.slot}, ${w.rain}, ${w.heat}, ${w.storm})
    ON CONFLICT (device_id, report_date, slot) DO UPDATE SET rain = EXCLUDED.rain, heat = EXCLUDED.heat, storm = EXCLUDED.storm, district = EXCLUDED.district
  `;
  revalidatePath("/today");
  return {};
}

const priceSchema = z.object({
  commodity: z.string().refine((k) => COMMODITY_BY_KEY.has(k)),
  priceType: z.enum(["wholesale", "retail"]),
  price: z.number().positive().max(1_000_000),
});

export async function submitPrice(input: z.input<typeof priceSchema>): Promise<{ error?: string; flagged?: boolean }> {
  const device = await requireDevice();
  const parsed = priceSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  if (!(await rateLimit(`price:${device.id}`, 60, 3600))) return { error: "rate_limited" };
  const p = parsed.data;

  // Reports far from the known market level are kept but excluded from medians.
  const ref = referencePrice(p.commodity, (await currentPrices(device.district)).get(p.commodity));
  const refForType = p.priceType === "wholesale" ? ref * 0.85 : ref;
  const flagged = p.price < refForType / 3 || p.price > refForType * 3;

  const sql = await getDb();
  await sql`
    INSERT INTO price_reports (device_id, district, commodity, price_type, price, report_date, flagged)
    VALUES (${device.id}, ${device.district}, ${p.commodity}, ${p.priceType}, ${p.price}, ${bdToday()}, ${flagged})
    ON CONFLICT (device_id, commodity, price_type, report_date) DO UPDATE SET price = EXCLUDED.price, flagged = EXCLUDED.flagged
  `;
  revalidatePath("/today");
  return { flagged };
}
