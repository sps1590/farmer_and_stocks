import { isCronAuthorized } from "@/lib/cron-auth";
import { logged } from "@/lib/ingest/runs";
import { ingestClimateNormals, ingestWeatherForecast } from "@/lib/ingest/weather";
import { ingestTcb, ingestWfp } from "@/lib/ingest/prices";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return new Response("unauthorized", { status: 401 });
  const results = [];
  results.push(await logged("open-meteo", ingestWeatherForecast));
  results.push(await logged("open-meteo-climate", ingestClimateNormals));
  results.push(await logged("wfp", ingestWfp));
  results.push(await logged("tcb", ingestTcb));
  return Response.json({ results });
}
