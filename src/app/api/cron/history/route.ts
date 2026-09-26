import { isCronAuthorized } from "@/lib/cron-auth";
import { logged } from "@/lib/ingest/runs";
import { ingestWeatherHistory } from "@/lib/ingest/weather";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return new Response("unauthorized", { status: 401 });
  return Response.json(await logged("weather-history", ingestWeatherHistory));
}
