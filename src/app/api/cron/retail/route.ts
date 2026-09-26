import { isCronAuthorized } from "@/lib/cron-auth";
import { claimRefresh, runRefresh } from "@/lib/refresh";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** Daily "update today's price" (same job as the in-app button). */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return new Response("unauthorized", { status: 401 });
  const id = await claimRefresh("cron", true);
  return Response.json({ results: id ? await runRefresh(id) : [] });
}
