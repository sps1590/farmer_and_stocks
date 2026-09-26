import { isCronAuthorized } from "@/lib/cron-auth";
import { logged } from "@/lib/ingest/runs";
import { sendSlot } from "@/lib/push";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: RouteContext<"/api/cron/notify/[slot]">) {
  if (!isCronAuthorized(request)) return new Response("unauthorized", { status: 401 });
  const slot = Number((await ctx.params).slot);
  if (slot !== 1 && slot !== 2 && slot !== 3) return new Response("bad slot", { status: 400 });
  return Response.json(await logged(`push-${slot}`, () => sendSlot(slot)));
}
