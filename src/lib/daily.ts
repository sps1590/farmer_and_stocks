import "server-only";
import { getDb } from "./db";
import { bdToday } from "./time";

// Day-to-day price comparison built from the stored daily snapshots.
//
// A commodity's change is the mean of each source's own change (like-for-like),
// so a source that is missing on one of the two days can't create a fake jump.

export const DAILY_SOURCES = ["chaldal", "shwapno", "tcb"] as const;
export type DailySource = (typeof DAILY_SOURCES)[number];

type Point = { date: string; price: number };

export type DailyRow = {
  commodity: string;
  date: string | null; // latest observation date
  price: number | null; // mean of latest source prices
  perSource: Partial<Record<DailySource, { today: Point; prev: Point | null; week: Point | null }>>;
  dayChange: number | null; // vs previous observation
  weekChange: number | null; // vs ~7 days earlier
};

function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export async function dailyBoard(days = 14): Promise<Map<string, DailyRow>> {
  const sql = await getDb();
  const rows = (await sql`
    SELECT commodity, source, obs_date::text AS date, price::float AS price
    FROM ext_prices
    WHERE source IN ('chaldal', 'shwapno', 'tcb') AND obs_date >= (${bdToday()}::date - ${days}::int)
    ORDER BY commodity, source, obs_date DESC
  `) as { commodity: string; source: DailySource; date: string; price: number }[];

  const series = new Map<string, Map<DailySource, Point[]>>();
  for (const r of rows) {
    const bySrc = series.get(r.commodity) ?? new Map<DailySource, Point[]>();
    bySrc.set(r.source, [...(bySrc.get(r.source) ?? []), { date: r.date, price: r.price }]);
    series.set(r.commodity, bySrc);
  }

  const out = new Map<string, DailyRow>();
  for (const [commodity, bySrc] of series) {
    const row: DailyRow = { commodity, date: null, price: null, perSource: {}, dayChange: null, weekChange: null };
    const day: number[] = [];
    const week: number[] = [];
    const latest: number[] = [];
    for (const [src, pts] of bySrc) {
      const today = pts[0];
      const prev = pts[1] ?? null;
      const target = Date.parse(today.date) - 7 * 86400_000;
      const wk = pts.find((p) => Date.parse(p.date) <= target) ?? null;
      row.perSource[src] = { today, prev, week: wk };
      latest.push(today.price);
      if (!row.date || today.date > row.date) row.date = today.date;
      if (prev) day.push(today.price / prev.price - 1);
      if (wk) week.push(today.price / wk.price - 1);
    }
    row.price = mean(latest);
    row.dayChange = mean(day);
    row.weekChange = mean(week);
    out.set(commodity, row);
  }
  return out;
}

export type ProductChange = {
  source: string;
  name: string;
  packSize: string | null;
  date: string;
  regular: number;
  sale: number | null;
  perUnit: number | null;
  prevDate: string | null;
  prevRegular: number | null;
  change: number | null;
};

/** Every stored product's latest regular price vs its previous snapshot. */
export async function productChanges(commodity?: string): Promise<ProductChange[]> {
  const sql = await getDb();
  const rows = (await sql`
    WITH ranked AS (
      SELECT source, product_key, name, pack_size, obs_date, regular_price::float AS regular, sale_price::float AS sale,
             per_unit_price::float AS per_unit, commodity,
             ROW_NUMBER() OVER (PARTITION BY source, product_key ORDER BY obs_date DESC) AS rn
      FROM retail_product_prices
      WHERE obs_date >= ${bdToday()}::date - 30
        AND (${commodity ?? null}::text IS NULL OR commodity = ${commodity ?? null})
    )
    SELECT a.source, a.name, a.pack_size, a.obs_date::text AS date, a.regular, a.sale, a.per_unit,
           b.obs_date::text AS prev_date, b.regular AS prev_regular
    FROM ranked a LEFT JOIN ranked b ON b.source = a.source AND b.product_key = a.product_key AND b.rn = 2
    WHERE a.rn = 1
    ORDER BY a.source, a.name
  `) as {
    source: string;
    name: string;
    pack_size: string | null;
    date: string;
    regular: number;
    sale: number | null;
    per_unit: number | null;
    prev_date: string | null;
    prev_regular: number | null;
  }[];
  return rows.map((r) => ({
    source: r.source,
    name: r.name,
    packSize: r.pack_size,
    date: r.date,
    regular: r.regular,
    sale: r.sale,
    perUnit: r.per_unit,
    prevDate: r.prev_date,
    prevRegular: r.prev_regular,
    change: r.prev_regular ? r.regular / r.prev_regular - 1 : null,
  }));
}

export async function productStats() {
  const sql = await getDb();
  const r = (await sql`
    SELECT COUNT(DISTINCT (source, product_key))::int AS products, COUNT(DISTINCT obs_date)::int AS days, MIN(obs_date)::text AS since
    FROM retail_product_prices
  `) as { products: number; days: number; since: string | null }[];
  return r[0];
}

/** Daily mean price per commodity (across sources) for sparklines, oldest first. */
export async function dailySeries(days = 30): Promise<Map<string, number[]>> {
  const sql = await getDb();
  const rows = (await sql`
    SELECT commodity, obs_date::text AS date, AVG(price)::float AS price
    FROM ext_prices
    WHERE source IN ('chaldal', 'shwapno', 'tcb') AND obs_date >= (${bdToday()}::date - ${days}::int)
    GROUP BY commodity, obs_date ORDER BY commodity, obs_date
  `) as { commodity: string; date: string; price: number }[];
  const out = new Map<string, number[]>();
  for (const r of rows) out.set(r.commodity, [...(out.get(r.commodity) ?? []), r.price]);
  return out;
}
