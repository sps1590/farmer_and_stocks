import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { SCHEMA_STATEMENTS } from "./schema";

// One shared Postgres client. Production uses Neon over HTTP. For local
// development and tests without a Postgres server, DATABASE_URL=pglite:<dir>
// (or pglite:memory) runs real Postgres in-process via PGlite (dev dependency).
//
// The schema is ensured once per server process and cached on globalThis so
// dev hot-reload doesn't re-run it on every save.

export type Sql = NeonQueryFunction<false, false>;

declare global {
  var __fsDbReady: Promise<Sql> | undefined;
}

async function pgliteClient(target: string): Promise<Sql> {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = target === "memory" ? new PGlite() : new PGlite(target);
  const run = async (text: string, params: unknown[] = []) => (await db.query(text, params)).rows as Record<string, unknown>[];
  const tag = (strings: TemplateStringsArray, ...values: unknown[]) =>
    run(strings.reduce((acc, s, i) => `${acc}$${i}${s}`), values);
  // Only the two call shapes this app uses: sql`...` and sql.query(text, params).
  return Object.assign(tag, { query: (text: string, params?: unknown[]) => run(text, params) }) as unknown as Sql;
}

async function connect(): Promise<Sql> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");
  const sql = url.startsWith("pglite:") ? await pgliteClient(url.slice("pglite:".length)) : neon(url);
  for (const statement of SCHEMA_STATEMENTS) {
    await sql.query(statement);
  }
  return sql;
}

export async function getDb(): Promise<Sql> {
  if (!globalThis.__fsDbReady) {
    globalThis.__fsDbReady = connect().catch((err) => {
      globalThis.__fsDbReady = undefined; // retry on the next request
      throw err;
    });
  }
  return globalThis.__fsDbReady;
}

export function isDbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}
