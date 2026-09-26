import { isCronAuthorized } from "@/lib/cron-auth";
import { logged } from "@/lib/ingest/runs";
import { ingestChaldal, ingestShwapno } from "@/lib/ingest/retail";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return new Response("unauthorized", { status: 401 });
  const results = [await logged("chaldal", ingestChaldal), await logged("shwapno", ingestShwapno)];
  return Response.json({ results });
}
