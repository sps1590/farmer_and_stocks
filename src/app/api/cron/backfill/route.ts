import { isCronAuthorized } from "@/lib/cron-auth";
import { logged } from "@/lib/ingest/runs";
import { ingestTcbArchive, setTcbArchivePage } from "@/lib/ingest/prices";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** Resumable 5-year TCB archive backfill; a no-op once complete. `?from=N` restarts at page N. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return new Response("unauthorized", { status: 401 });
  const from = Number(new URL(request.url).searchParams.get("from"));
  if (Number.isInteger(from) && from > 0) await setTcbArchivePage(from);
  return Response.json(await logged("tcb-archive", () => ingestTcbArchive()));
}
