import { isCronAuthorized } from "@/lib/cron-auth";
import { logged } from "@/lib/ingest/runs";
import { ingestTcbArchive } from "@/lib/ingest/prices";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** Resumable 5-year TCB archive backfill; a no-op once complete. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return new Response("unauthorized", { status: 401 });
  return Response.json(await logged("tcb-archive", () => ingestTcbArchive()));
}
