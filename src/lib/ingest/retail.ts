import "server-only";
import { getDb } from "../db";
import { COMMODITY_BY_KEY } from "../catalog";
import { bdToday } from "../time";
import { RETAIL, matches, packSize, parseChaldal, parseShwapno } from "./retail-parse";

// Daily Dhaka retail prices from online grocers, always the REGULAR price
// (the struck-through "original" price when a discount is running):
//
//  - Chaldal: server-rendered category pages. A discounted card renders
//    <div class="productV2discountedPrice">৳sale<div class="price">৳regular</div>,
//    an undiscounted one just <div class="price">৳regular</div>.
//  - Shwapno: server-rendered product pages embed
//    "price":{"oldPriceValue":regular,"priceValue":sale,...} (oldPrice only when discounted).
//    Product URLs come from the public sitemaps; robots.txt disallows /api and
//    query strings, so neither is used.
//
// Each product's pack size is parsed from its name ("500 gm", "5kg", "1 Ltr",
// "12 pcs", "... Kg") and converted to the commodity's unit. Items without a
// parseable size (e.g. "1 bundle", whole pumpkins) are skipped.

const UA = "KrishiBazarAI/1.0 (+https://github.com/sps1590/farmer_and_stocks; daily price index, 1 req/s)";

type Obs = { commodity: string; name: string; perUnit: number };

async function getText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, cache: "no-store", signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- Chaldal

const CHALDAL_CATEGORIES = ["fresh-vegetable", "oil", "flour"];

async function scrapeChaldal(): Promise<{ obs: Obs[]; errors: string[] }> {
  const obs: Obs[] = [];
  const errors: string[] = [];
  for (const cat of CHALDAL_CATEGORIES) {
    try {
      for (const p of parseChaldal(await getText(`https://chaldal.com/${cat}`))) {
        for (const [key, rule] of Object.entries(RETAIL)) {
          const cm = COMMODITY_BY_KEY.get(key)!;
          if (!matches(rule.chaldal, p.name)) continue;
          const size = packSize(`${p.name} ${p.size}`, cm.unit);
          if (size && p.regular > 0) obs.push({ commodity: key, name: p.name, perUnit: p.regular / size });
          break;
        }
      }
    } catch (err) {
      errors.push(`chaldal/${cat}: ${err instanceof Error ? err.message : String(err)}`);
    }
    await sleep(1000);
  }
  return { obs, errors };
}

// ---------------------------------------------------------------- Shwapno

const SITEMAP_INDEX = "https://www.shwapno.com/sitemap-products.xml";

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
      const slug = url.split("/").pop()!.replace(/-/g, " ");
      for (const [key, rule] of Object.entries(RETAIL)) {
        if (matches(rule.shwapno, slug)) {
          found.push({ url, commodity: key });
          break;
        }
      }
    }
    await sleep(500);
  }
  // Cap per commodity so the daily crawl stays small and polite.
  const perCommodity = new Map<string, number>();
  const kept = found.filter((f) => {
    const n = perCommodity.get(f.commodity) ?? 0;
    perCommodity.set(f.commodity, n + 1);
    return n < 4;
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

async function scrapeShwapno(): Promise<{ obs: Obs[]; errors: string[] }> {
  const obs: Obs[] = [];
  const errors: string[] = [];
  try {
    await refreshShwapnoProducts();
  } catch (err) {
    errors.push(`shwapno sitemap: ${err instanceof Error ? err.message : String(err)}`);
  }
  const sql = await getDb();
  const products = (await sql`SELECT url, commodity FROM retail_products WHERE source = 'shwapno' ORDER BY commodity`) as { url: string; commodity: string }[];
  for (const p of products) {
    try {
      const parsed = parseShwapno(await getText(p.url));
      const cm = COMMODITY_BY_KEY.get(p.commodity);
      if (parsed && cm && matches(RETAIL[p.commodity]?.shwapno, parsed.name)) {
        const size = packSize(parsed.name, cm.unit);
        if (size) obs.push({ commodity: p.commodity, name: parsed.name, perUnit: parsed.regular / size });
      }
    } catch (err) {
      errors.push(`shwapno: ${err instanceof Error ? err.message : String(err)}`);
    }
    await sleep(700);
  }
  return { obs, errors };
}

// ---------------------------------------------------------------- store

async function store(source: "chaldal" | "shwapno", obs: Obs[]): Promise<number> {
  const by = new Map<string, number[]>();
  for (const o of obs) {
    // Guard against pack-size mis-parses: keep within 0.3x..3x of the reference price.
    const ref = COMMODITY_BY_KEY.get(o.commodity)!.ref;
    if (o.perUnit < ref * 0.3 || o.perUnit > ref * 3) continue;
    by.set(o.commodity, [...(by.get(o.commodity) ?? []), o.perUnit]);
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

export async function ingestChaldal() {
  const { obs, errors } = await scrapeChaldal();
  const rows = await store("chaldal", obs);
  if (!rows && errors.length) throw new Error(errors.join("; "));
  return { rows, message: `${obs.length} products${errors.length ? `; ${errors.join("; ").slice(0, 300)}` : ""}` };
}

export async function ingestShwapno() {
  const { obs, errors } = await scrapeShwapno();
  const rows = await store("shwapno", obs);
  if (!rows && errors.length) throw new Error(errors.slice(0, 5).join("; "));
  return { rows, message: `${obs.length} products${errors.length ? `; ${errors.length} errors` : ""}` };
}

export const RETAIL_COMMODITIES = Object.keys(RETAIL);
