import "server-only";
import { getDb } from "../db";
import { COMMODITIES, type Commodity } from "../catalog";
import { DISTRICT_BY_WFP } from "../geo";
import { callPy } from "../pyclient";
import { lastSuccess } from "./runs";

// ---------------------------------------------------------------------------
// WFP / HDX: monthly retail prices by district market (CC-BY-IGO).
// ---------------------------------------------------------------------------

const HDX_PACKAGE = "https://data.humdata.org/api/3/action/package_show?id=wfp-food-prices-for-bangladesh";

const WFP_UNIT: Record<Commodity["unit"], string[]> = { kg: ["KG"], L: ["L"], piece: ["1 piece"], maund: [] };

/** Minimal RFC-4180 line splitter (quoted fields, no embedded newlines in this dataset). */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export async function ingestWfp(): Promise<{ rows: number; message?: string }> {
  const meta = (await (await fetch(HDX_PACKAGE, { cache: "no-store", signal: AbortSignal.timeout(30_000) })).json()) as {
    result: { resources: { name: string; url: string; last_modified: string }[] };
  };
  const res = meta.result.resources.find((r) => /food prices/i.test(r.name) && r.url.endsWith(".csv"));
  if (!res) throw new Error("WFP price CSV not found in HDX package");

  const marker = `last_modified=${res.last_modified}`;
  const prev = await lastSuccess("wfp");
  if (prev?.message === marker) return { rows: 0, message: marker };

  const csv = await (await fetch(res.url, { cache: "no-store", signal: AbortSignal.timeout(90_000) })).text();
  const lines = csv.split(/\r?\n/);
  const header = splitCsvLine(lines[0]);
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`WFP CSV missing column ${name}`);
    return i;
  };
  const c = { date: col("date"), admin2: col("admin2"), market: col("market"), commodity: col("commodity"), unit: col("unit"), pricetype: col("pricetype"), price: col("price") };

  const byName = new Map<string, Commodity>();
  for (const cm of COMMODITIES) for (const n of cm.wfp) byName.set(n, cm);

  const rows = { commodity: [] as string[], market: [] as string[], district: [] as (string | null)[], date: [] as string[], price: [] as number[] };
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i] || lines[i].startsWith("#")) continue;
    const r = splitCsvLine(lines[i]);
    const cm = byName.get(r[c.commodity]);
    if (!cm || r[c.pricetype] !== "Retail" || !WFP_UNIT[cm.unit].includes(r[c.unit])) continue;
    if (r[c.date] < "2000-01-01") continue;
    const price = Number(r[c.price]);
    if (!(price > 0)) continue;
    rows.commodity.push(cm.key);
    rows.market.push(r[c.market]);
    rows.district.push(DISTRICT_BY_WFP.get(r[c.admin2].toLowerCase())?.key ?? null);
    rows.date.push(r[c.date]);
    rows.price.push(price);
  }

  const sql = await getDb();
  const CHUNK = 3000;
  for (let i = 0; i < rows.commodity.length; i += CHUNK) {
    const s = (a: unknown[]) => a.slice(i, i + CHUNK);
    await sql`
      INSERT INTO ext_prices (source, commodity, market, district, price_type, obs_date, price)
      SELECT 'wfp', cm, mk, di, 'retail', dt, pr
      FROM unnest(${s(rows.commodity)}::text[], ${s(rows.market)}::text[], ${s(rows.district)}::text[], ${s(rows.date)}::date[], ${s(rows.price)}::numeric[]) AS u(cm, mk, di, dt, pr)
      ON CONFLICT (source, commodity, market, price_type, obs_date) DO UPDATE SET price = EXCLUDED.price, district = EXCLUDED.district
    `;
  }
  return { rows: rows.commodity.length, message: marker };
}

// ---------------------------------------------------------------------------
// TCB: daily Dhaka retail min/max prices (parsed by the Python function).
// ---------------------------------------------------------------------------

type TcbSheet = { date: string; source_url: string; rows: { name: string; unit: string; points: { date: string; min: number; max: number }[] }[] };

export function matchTcb(name: string): Commodity | undefined {
  const n = name.normalize("NFC").replace(/\s+/g, " ").trim();
  return COMMODITIES.find((c) => c.tcb.some((re) => re.test(n)));
}

async function storeTcbSheets(sheets: TcbSheet[]): Promise<number> {
  const commodity: string[] = [], date: string[] = [], price: number[] = [], min: number[] = [], max: number[] = [];
  const seen = new Set<string>();
  for (const sheet of sheets) {
    for (const row of sheet.rows) {
      const cm = matchTcb(row.name);
      if (!cm) continue;
      const div = cm.tcbDivisor ?? 1;
      for (const p of row.points) {
        const k = `${cm.key}|${p.date}`;
        if (seen.has(k)) continue; // first matching row (e.g. loose, not bottled) wins
        seen.add(k);
        commodity.push(cm.key);
        date.push(p.date);
        min.push(p.min / div);
        max.push(p.max / div);
        price.push((p.min + p.max) / 2 / div);
      }
    }
  }
  if (!commodity.length) return 0;
  const sql = await getDb();
  await sql`
    INSERT INTO ext_prices (source, commodity, market, district, price_type, obs_date, price, price_min, price_max)
    SELECT 'tcb', cm, 'Dhaka (TCB)', 'dhaka', 'retail', dt, pr, lo, hi
    FROM unnest(${commodity}::text[], ${date}::date[], ${price}::numeric[], ${min}::numeric[], ${max}::numeric[]) AS u(cm, dt, pr, lo, hi)
    ON CONFLICT (source, commodity, market, price_type, obs_date) DO UPDATE SET price = EXCLUDED.price, price_min = EXCLUDED.price_min, price_max = EXCLUDED.price_max
  `;
  return commodity.length;
}

export async function ingestTcb(): Promise<{ rows: number; message?: string }> {
  const sql = await getDb();
  const have = (await sql`SELECT COUNT(DISTINCT to_char(obs_date, 'YYYY-MM'))::int AS c FROM ext_prices WHERE source = 'tcb'`) as { c: number }[];
  const errors: string[] = [];
  let rows = 0;

  // TCB publishes ~20 sheets/month, 10 per listing page. Each sheet also
  // carries 1-week, 1-month and 1-year-ago prices, so one sheet every ~3
  // pages rebuilds roughly two years of monthly history on first run.
  const pages = have[0].c >= 12 ? [1] : Array.from({ length: 14 }, (_, i) => 1 + i * 3);
  for (const page of pages) {
    try {
      const r = await callPy<{ sheets: TcbSheet[]; errors: string[] }>(`/api/py/tcb?page=${page}&limit=${page === 1 ? 3 : 1}`, { timeoutMs: 90_000 });
      rows += await storeTcbSheets(r.sheets);
      await storeTcbProducts(r.sheets);
      errors.push(...r.errors);
    } catch (err) {
      errors.push(`page ${page}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (rows === 0 && errors.length) throw new Error(errors.join("; ").slice(0, 900));
  return { rows, message: errors.length ? `partial: ${errors.join("; ").slice(0, 600)}` : undefined };
}

/** Every TCB item (not just tracked commodities) as a daily product price row. */
async function storeTcbProducts(sheets: TcbSheet[]): Promise<number> {
  const key: string[] = [], date: string[] = [], name: string[] = [], unit: string[] = [], price: number[] = [];
  const seen = new Set<string>();
  for (const sheet of sheets) {
    for (const row of sheet.rows) {
      // Only the sheet's own date: the week/month/year-ago columns belong to other days' sheets.
      const p = row.points.find((x) => x.date === sheet.date);
      if (!p) continue;
      const k = `${row.name} | ${row.unit}`.normalize("NFC");
      if (seen.has(`${k}|${p.date}`)) continue;
      seen.add(`${k}|${p.date}`);
      key.push(k);
      date.push(p.date);
      name.push(row.name);
      unit.push(row.unit);
      price.push(Math.round(((p.min + p.max) / 2) * 100) / 100);
    }
  }
  if (!key.length) return 0;
  const sql = await getDb();
  await sql`
    INSERT INTO retail_product_prices (source, product_key, obs_date, name, commodity, pack_size, regular_price, url)
    SELECT 'tcb', k, d, n, NULL, u, p, 'https://tcb.gov.bd/pages/daily-rmps'
    FROM unnest(${key}::text[], ${date}::date[], ${name}::text[], ${unit}::text[], ${price}::numeric[]) AS t(k, d, n, u, p)
    ON CONFLICT (source, product_key, obs_date) DO NOTHING
  `;
  return key.length;
}

// ---------------------------------------------------------------------------
// One-time backfill of TCB's whole public archive (~1,400 daily sheets since
// May 2021, each also carrying the price one year earlier, so the series
// reaches back to 2020). Resumable: the next listing page is kept in
// ingest_state and each run works for a bounded time.
// ---------------------------------------------------------------------------

const ARCHIVE_KEY = "tcb_archive_next_page";

export async function ingestTcbArchive(budgetMs = 230_000): Promise<{ rows: number; message?: string }> {
  const sql = await getDb();
  const state = (await sql`SELECT value FROM ingest_state WHERE key = ${ARCHIVE_KEY}`) as { value: string }[];
  let page = Number(state[0]?.value ?? 1);
  if (page < 0) return { rows: 0, message: "archive complete" };

  const started = Date.now();
  let rows = 0;
  let sheets = 0;
  const errors: string[] = [];
  while (Date.now() - started < budgetMs) {
    try {
      const r = await callPy<{ sheets: TcbSheet[]; errors: string[]; links?: number }>(`/api/py/tcb?page=${page}&limit=10`, { timeoutMs: 110_000 });
      errors.push(...r.errors.slice(0, 2));
      if (r.links === 0) {
        page = -1; // past the last page
        break;
      }
      // A page can hold only one-off reports in another layout: skip it.
      rows += await storeTcbSheets(r.sheets);
      await storeTcbProducts(r.sheets);
      sheets += r.sheets.length;
      page += 1;
      await sql`
        INSERT INTO ingest_state (key, value, updated_at) VALUES (${ARCHIVE_KEY}, ${String(page)}, now())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `;
    } catch (err) {
      errors.push(`page ${page}: ${err instanceof Error ? err.message : String(err)}`);
      break; // retry this page next run
    }
  }
  if (page === -1) {
    await sql`
      INSERT INTO ingest_state (key, value, updated_at) VALUES (${ARCHIVE_KEY}, '-1', now())
      ON CONFLICT (key) DO UPDATE SET value = '-1', updated_at = now()
    `;
  }
  return {
    rows,
    message: `${sheets} sheets${page === -1 ? ", archive complete" : `, next page ${page}`}${errors.length ? `; ${errors.join("; ").slice(0, 300)}` : ""}`,
  };
}

export async function setTcbArchivePage(page: number) {
  const sql = await getDb();
  await sql`
    INSERT INTO ingest_state (key, value, updated_at) VALUES (${ARCHIVE_KEY}, ${String(page)}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}
