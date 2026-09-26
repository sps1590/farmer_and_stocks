import "server-only";
import { getDb } from "../db";
import { COMMODITY_BY_KEY } from "../catalog";
import { bdToday } from "../time";
import { RETAIL, matches, naturalPack, packSize, parseChaldal, parseShwapno } from "./retail-parse";

// Daily Dhaka retail prices from online grocers.
//
// Two layers are stored:
//  1. retail_product_prices — every product seen, every day (regular price,
//     sale price if any, pack size, price per kg/L/piece). This is the
//     day-to-day comparison table.
//  2. ext_prices (source 'chaldal'/'shwapno') — per tracked commodity, the
//     mean REGULAR price per unit of the matching products. This feeds the
//     "Avg. price" and, once long enough, the forecasts.
//
//  - Chaldal: server-rendered category pages. A discounted card renders
//    <div class="productV2discountedPrice">৳sale<div class="price">৳regular</div>,
//    an undiscounted one just <div class="price">৳regular</div>.
//  - Shwapno: server-rendered product pages embed
//    "price":{"oldPriceValue":regular,"priceValue":sale,...} (oldPrice only when discounted).
//    Product URLs come from the public sitemaps; robots.txt disallows /api and
//    query strings, so neither is used.

const UA = "KrishiBazarAI/1.0 (+https://github.com/sps1590/farmer_and_stocks; daily price index, 1 req/s)";

type ProductRow = {
  key: string;
  name: string;
  category: string | null;
  commodity: string | null;
  size: string | null;
  regular: number;
  sale: number | null;
  perUnit: number | null;
  url: string | null;
};

async function getText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, cache: "no-store", signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function commodityFor(source: "chaldal" | "shwapno", text: string): string | null {
  for (const [key, rule] of Object.entries(RETAIL)) if (matches(rule[source], text)) return key;
  return null;
}

/** Price per commodity unit (for mapped products) or per natural unit (for the rest). */
function perUnitPrice(text: string, commodity: string | null, regular: number): number | null {
  const cm = commodity ? COMMODITY_BY_KEY.get(commodity) : undefined;
  const qty = cm ? packSize(text, cm.unit) : naturalPack(text)?.qty ?? null;
  return qty ? Math.round((regular / qty) * 100) / 100 : null;
}

// ---------------------------------------------------------------- Chaldal

/** Category pages whose products are in the server-rendered HTML. */
export const CHALDAL_CATEGORIES = ["fresh-vegetable", "fresh-fruit", "oil", "flour"];

async function scrapeChaldal(): Promise<{ rows: ProductRow[]; errors: string[] }> {
  const rows: ProductRow[] = [];
  const errors: string[] = [];
  for (const cat of CHALDAL_CATEGORIES) {
    try {
      let products = parseChaldal(await getText(`https://chaldal.com/${cat}`));
      if (!products.length) {
        // Occasionally the page comes back without its product grid; retry once.
        await sleep(3000);
        products = parseChaldal(await getText(`https://chaldal.com/${cat}`));
        if (!products.length) errors.push(`chaldal/${cat}: no products on page`);
      }
      for (const p of products) {
        const commodity = commodityFor("chaldal", p.name);
        rows.push({
          key: `${p.name} | ${p.size}`.toLowerCase(),
          name: p.name,
          category: cat,
          commodity,
          size: p.size,
          regular: p.regular,
          sale: p.sale,
          perUnit: perUnitPrice(`${p.name} ${p.size}`, commodity, p.regular),
          url: `https://chaldal.com/${cat}`,
        });
      }
    } catch (err) {
      errors.push(`chaldal/${cat}: ${errMsg(err)}`);
    }
    await sleep(1000);
  }
  return { rows, errors };
}

// ---------------------------------------------------------------- Shwapno

const SITEMAP_INDEX = "https://www.shwapno.com/sitemap-products.xml";
const SHWAPNO_PER_COMMODITY = 6;

/** Refresh the product URL registry from Shwapno's public sitemaps (weekly). */
async function refreshShwapnoProducts(): Promise<number> {
  const sql = await getDb();
  const fresh = (await sql`
    SELECT COUNT(*)::int AS c FROM retail_products WHERE source = 'shwapno' AND last_seen >= ${bdToday()}::date - 7
  `) as { c: number }[];
  if (fresh[0].c > 0) return 0;

  const index = await getText(SITEMAP_INDEX);
  const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const found: { url: string; commodity: string }[] = [];
  for (const map of maps) {
    const xml = await getText(map);
    for (const [, url] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const commodity = commodityFor("shwapno", url.split("/").pop()!.replace(/-/g, " "));
      if (commodity) found.push({ url, commodity });
    }
    await sleep(500);
  }
  // Cap per commodity so each crawl stays small and polite.
  const perCommodity = new Map<string, number>();
  const kept = found.filter((f) => {
    const n = perCommodity.get(f.commodity) ?? 0;
    perCommodity.set(f.commodity, n + 1);
    return n < SHWAPNO_PER_COMMODITY;
  });
  await sql`DELETE FROM retail_products WHERE source = 'shwapno'`;
  if (kept.length) {
    await sql`
      INSERT INTO retail_products (source, url, commodity, last_seen)
      SELECT 'shwapno', u, c, ${bdToday()}::date FROM unnest(${kept.map((k) => k.url)}::text[], ${kept.map((k) => k.commodity)}::text[]) AS t(u, c)
      ON CONFLICT (source, url) DO NOTHING
    `;
  }
  return kept.length;
}

async function scrapeShwapno(): Promise<{ rows: ProductRow[]; errors: string[] }> {
  const rows: ProductRow[] = [];
  const errors: string[] = [];
  try {
    await refreshShwapnoProducts();
  } catch (err) {
    errors.push(`shwapno sitemap: ${errMsg(err)}`);
  }
  const sql = await getDb();
  const products = (await sql`SELECT url, commodity FROM retail_products WHERE source = 'shwapno' ORDER BY commodity`) as { url: string; commodity: string }[];
  for (const p of products) {
    try {
      const parsed = parseShwapno(await getText(p.url));
      if (parsed) {
        // Keep the product row even if its name no longer matches; only
        // matching products count towards the commodity average.
        const commodity = matches(RETAIL[p.commodity]?.shwapno, parsed.name) ? p.commodity : null;
        rows.push({
          key: p.url.split("/").pop()!.toLowerCase(),
          name: parsed.name,
          category: null,
          commodity,
          size: null,
          regular: parsed.regular,
          sale: parsed.sale,
          perUnit: perUnitPrice(parsed.name, commodity, parsed.regular),
          url: p.url,
        });
      }
    } catch (err) {
      errors.push(`shwapno: ${errMsg(err)}`);
    }
    await sleep(700);
  }
  return { rows, errors };
}

// ---------------------------------------------------------------- store

async function storeProducts(source: "chaldal" | "shwapno", rows: ProductRow[]) {
  if (!rows.length) return;
  // De-duplicate within a run (the same card can appear in two categories).
  const uniq = [...new Map(rows.map((r) => [r.key, r])).values()];
  const sql = await getDb();
  const col = <K extends keyof ProductRow>(k: K) => uniq.map((r) => r[k]);
  await sql`
    INSERT INTO retail_product_prices (source, product_key, obs_date, name, category, commodity, pack_size, regular_price, sale_price, per_unit_price, url)
    SELECT ${source}, k, ${bdToday()}::date, n, c, cm, sz, rp, sp, pu, u
    FROM unnest(${col("key")}::text[], ${col("name")}::text[], ${col("category")}::text[], ${col("commodity")}::text[], ${col("size")}::text[],
                ${col("regular")}::numeric[], ${col("sale")}::numeric[], ${col("perUnit")}::numeric[], ${col("url")}::text[])
      AS t(k, n, c, cm, sz, rp, sp, pu, u)
    ON CONFLICT (source, product_key, obs_date) DO UPDATE SET
      name = EXCLUDED.name, regular_price = EXCLUDED.regular_price, sale_price = EXCLUDED.sale_price,
      per_unit_price = EXCLUDED.per_unit_price, commodity = EXCLUDED.commodity, captured_at = now()
  `;
}

/** Commodity-level mean of regular per-unit prices -> ext_prices. */
async function storeCommodityAverages(source: "chaldal" | "shwapno", rows: ProductRow[]): Promise<number> {
  const by = new Map<string, number[]>();
  for (const r of rows) {
    if (!r.commodity || r.perUnit === null) continue;
    // Guard against pack-size mis-parses: keep within 0.3x..3x of the reference price.
    const ref = COMMODITY_BY_KEY.get(r.commodity)!.ref;
    if (r.perUnit < ref * 0.3 || r.perUnit > ref * 3) continue;
    by.set(r.commodity, [...(by.get(r.commodity) ?? []), r.perUnit]);
  }
  if (!by.size) return 0;
  const commodity: string[] = [], price: number[] = [], min: number[] = [], max: number[] = [];
  for (const [k, v] of by) {
    commodity.push(k);
    price.push(Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100);
    min.push(Math.min(...v));
    max.push(Math.max(...v));
  }
  const sql = await getDb();
  const market = source === "chaldal" ? "Dhaka (Chaldal)" : "Dhaka (Shwapno)";
  await sql`
    INSERT INTO ext_prices (source, commodity, market, district, price_type, obs_date, price, price_min, price_max)
    SELECT ${source}, cm, ${market}, 'dhaka', 'retail', ${bdToday()}::date, pr, lo, hi
    FROM unnest(${commodity}::text[], ${price}::numeric[], ${min}::numeric[], ${max}::numeric[]) AS u(cm, pr, lo, hi)
    ON CONFLICT (source, commodity, market, price_type, obs_date) DO UPDATE SET price = EXCLUDED.price, price_min = EXCLUDED.price_min, price_max = EXCLUDED.price_max
  `;
  return commodity.length;
}

async function ingest(source: "chaldal" | "shwapno", scrape: () => Promise<{ rows: ProductRow[]; errors: string[] }>) {
  const { rows, errors } = await scrape();
  await storeProducts(source, rows);
  const commodities = await storeCommodityAverages(source, rows);
  if (!rows.length && errors.length) throw new Error(errors.slice(0, 5).join("; "));
  return {
    rows: rows.length,
    message: `${rows.length} products, ${commodities} commodities${errors.length ? `; ${errors.length} errors: ${errors.join("; ").slice(0, 300)}` : ""}`,
  };
}

export const ingestChaldal = () => ingest("chaldal", scrapeChaldal);
export const ingestShwapno = () => ingest("shwapno", scrapeShwapno);
