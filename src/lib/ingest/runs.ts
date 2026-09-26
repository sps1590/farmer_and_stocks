import "server-only";
import { getDb } from "../db";

export type RunResult = { source: string; ok: boolean; rows: number; message?: string };

/** Runs one ingest step, logging success/failure to source_runs. Never throws. */
export async function logged(source: string, fn: () => Promise<{ rows: number; message?: string }>): Promise<RunResult> {
  const sql = await getDb();
  try {
    const { rows, message } = await fn();
    await sql`INSERT INTO source_runs (source, ok, rows, message) VALUES (${source}, true, ${rows}, ${message ?? null})`;
    return { source, ok: true, rows, message };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[ingest:${source}]`, err);
    await sql`INSERT INTO source_runs (source, ok, rows, message) VALUES (${source}, false, 0, ${message.slice(0, 1000)})`;
    return { source, ok: false, rows: 0, message };
  }
}

export async function lastSuccess(source: string) {
  const sql = await getDb();
  const rows = (await sql`
    SELECT started_at, message FROM source_runs WHERE source = ${source} AND ok ORDER BY started_at DESC LIMIT 1
  `) as { started_at: string; message: string | null }[];
  return rows[0] ?? null;
}
