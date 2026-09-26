import "server-only";
import { getDb } from "./db";
import { logged, type RunResult } from "./ingest/runs";
import { ingestChaldal, ingestShwapno } from "./ingest/retail";
import { ingestTcb } from "./ingest/prices";

// "Update today's price": one shared scrape of every price source, used by
// the button (Home + Market) and the daily cron. A run row doubles as a lock:
//  - a run started < 10 min ago and not finished  -> "running" (join it)
//  - a run finished < 30 min ago                   -> "fresh"   (nothing to do)
// so many users tapping at once trigger at most one polite crawl.

const RUNNING_WINDOW_MIN = 10;
const FRESH_WINDOW_MIN = 30;

export type RefreshStatus = {
  state: "idle" | "running" | "done" | "failed";
  id: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  summary: RunResult[] | null;
};

export async function refreshStatus(): Promise<RefreshStatus> {
  const sql = await getDb();
  const rows = (await sql`
    SELECT id, started_at::text, finished_at::text, status, summary FROM price_refresh_runs ORDER BY started_at DESC LIMIT 1
  `) as { id: number; started_at: string; finished_at: string | null; status: string; summary: RunResult[] | null }[];
  const r = rows[0];
  if (!r) return { state: "idle", id: null, startedAt: null, finishedAt: null, summary: null };
  const stale = r.status === "running" && Date.now() - new Date(r.started_at).getTime() > RUNNING_WINDOW_MIN * 60_000;
  return {
    state: stale ? "failed" : (r.status as RefreshStatus["state"]),
    id: r.id,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    summary: r.summary,
  };
}

/** Claims a new run unless one is running or finished recently. Returns the new run id, or null. */
export async function claimRefresh(trigger: "button" | "cron", force = false): Promise<number | null> {
  const sql = await getDb();
  const rows = (await sql`
    INSERT INTO price_refresh_runs (trigger)
    SELECT ${trigger}
    WHERE ${force} OR NOT EXISTS (
      SELECT 1 FROM price_refresh_runs
      WHERE (status = 'running' AND started_at > now() - make_interval(mins => ${RUNNING_WINDOW_MIN}))
         OR (status = 'done' AND finished_at > now() - make_interval(mins => ${FRESH_WINDOW_MIN}))
    )
    RETURNING id
  `) as { id: number }[];
  return rows[0]?.id ?? null;
}

export async function runRefresh(id: number): Promise<RunResult[]> {
  const sql = await getDb();
  const results: RunResult[] = [];
  try {
    results.push(await logged("chaldal", ingestChaldal));
    results.push(await logged("shwapno", ingestShwapno));
    results.push(await logged("tcb", ingestTcb));
    const ok = results.some((r) => r.ok);
    await sql`
      UPDATE price_refresh_runs SET status = ${ok ? "done" : "failed"}, finished_at = now(), summary = ${JSON.stringify(results)}::jsonb
      WHERE id = ${id}
    `;
  } catch (err) {
    await sql`
      UPDATE price_refresh_runs SET status = 'failed', finished_at = now(),
        summary = ${JSON.stringify([{ source: "refresh", ok: false, rows: 0, message: String(err) }])}::jsonb
      WHERE id = ${id}
    `;
  }
  return results;
}
