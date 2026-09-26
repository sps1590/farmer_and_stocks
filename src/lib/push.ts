import "server-only";
import webpush from "web-push";
import { getDb } from "./db";
import { SLOTS_FOR_COUNT } from "./time";
import { t } from "./i18n";

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  configured = true;
  return true;
}

const SLOT_QUESTION = { 1: "push_q_morning", 2: "push_q_midday", 3: "push_q_evening" } as const;

/** Send the check-in prompt for `slot` to every subscribed device that wants it. */
export async function sendSlot(slot: 1 | 2 | 3): Promise<{ rows: number; message?: string }> {
  if (!configure()) return { rows: 0, message: "VAPID keys not configured" };
  const counts = Object.entries(SLOTS_FOR_COUNT)
    .filter(([, slots]) => slots.includes(slot))
    .map(([c]) => Number(c));
  const sql = await getDb();
  const devices = (await sql`
    SELECT d.id, d.lang, d.push_subscription
    FROM devices d
    WHERE d.push_subscription IS NOT NULL AND d.pushes_per_day = ANY(${counts}::smallint[])
      AND NOT EXISTS (
        SELECT 1 FROM weather_reports w
        WHERE w.device_id = d.id AND w.slot = ${slot} AND w.report_date = (now() AT TIME ZONE 'Asia/Dhaka')::date
      )
  `) as { id: string; lang: "en" | "bn"; push_subscription: webpush.PushSubscription }[];

  let sent = 0;
  let gone = 0;
  for (const d of devices) {
    const payload = JSON.stringify({ title: t(d.lang, "app_name"), body: t(d.lang, SLOT_QUESTION[slot]), url: "/today" });
    try {
      await webpush.sendNotification(d.push_subscription, payload, { TTL: 60 * 60 * 4 });
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        gone++;
        await sql`UPDATE devices SET push_subscription = NULL WHERE id = ${d.id}`;
      } else {
        console.error("[push]", status, err);
      }
    }
  }
  return { rows: sent, message: `slot ${slot}: ${sent}/${devices.length} sent, ${gone} expired` };
}
