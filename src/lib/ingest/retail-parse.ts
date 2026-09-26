// Pure parsing/matching helpers for the retail scrapers (no I/O, unit-tested).
import type { Commodity } from "../catalog.ts";

type Match = { include: RegExp; exclude?: RegExp };

// Matched against the product name (Chaldal) or name + URL slug (Shwapno).
export const RETAIL: Record<string, { chaldal?: Match; shwapno?: Match }> = {
  potato: {
    chaldal: { include: /\b(potato regular|lal alu|potato \(?(diamond|cardinal|regular))/i, exclude: /sweet|misti/i },
    shwapno: { include: /\b(potato|alu)\b.*\b(loose|kg|regular|diamond|cardinal)/i, exclude: /sweet|misti|chips|fry|cracker|flakes|powder/i },
  },
  onion: {
    chaldal: { include: /deshi peyaj|onion.*(local|deshi)|(local|deshi).*onion/i },
    shwapno: { include: /(onion|peyaj|piyaj).*(deshi|local)|(deshi|local).*(onion|peyaj|piyaj)/i, exclude: /powder|paste|fried|chips|ring/i },
  },
  garlic: {
    chaldal: { include: /roshun.*(deshi|local)|garlic.*(deshi|local)/i },
    shwapno: { include: /garlic.*deshi|roshun.*deshi/i, exclude: /paste|powder|sauce/i },
  },
  ginger: {
    chaldal: { include: /deshi ada|ginger.*(local|deshi)/i },
    shwapno: { include: /ginger.*local|ada.*local/i, exclude: /paste|powder|tea|ale/i },
  },
  green_chili: {
    chaldal: { include: /kacha morich|green chil/i },
    shwapno: { include: /green[- ]chil|kacha[- ]morich/i, exclude: /pickle|sauce|flakes/i },
  },
  brinjal: {
    chaldal: { include: /begun|brinjal|eggplant/i },
    shwapno: { include: /brinjal|begun/i },
  },
  tomato: {
    chaldal: { include: /^(red |deshi |local )?tomato\b/i, exclude: /sauce|ketchup|puree|paste/i },
    shwapno: { include: /\btomato\b/i, exclude: /sauce|ketchup|puree|paste|soup|chips|crackers|alooz/i },
  },
  cauliflower: { chaldal: { include: /cauliflower|fulkopi/i }, shwapno: { include: /cauliflower|fulkopi/i } },
  cabbage: { chaldal: { include: /cabbage|bandhakopi/i, exclude: /chinese|red/i }, shwapno: { include: /cabbage|bandhakopi/i, exclude: /chinese|red/i } },
  pumpkin: { chaldal: { include: /misti kumra|sweet pumpkin/i }, shwapno: { include: /sweet[- ]pumpkin|misti[- ]kumra/i } },
  bottle_gourd: {
    chaldal: { include: /\blau\b|bottle gourd/i, exclude: /shak|leaves|leaf/i },
    shwapno: { include: /bottle[- ]gourd|\blau\b/i, exclude: /shak|leaves|leaf/i },
  },
  cucumber: { chaldal: { include: /shosha|cucumber/i }, shwapno: { include: /cucumber|shosha/i, exclude: /lotion|facewash|scrub|cleansing|gel/i } },
  soybean_oil: {
    chaldal: { include: /soybean oil/i, exclude: /tuna|sardine/i },
    shwapno: { include: /soybean[- ]oil/i, exclude: /tuna|sardine|chunk/i },
  },
  palm_oil: { chaldal: { include: /palm oil/i, exclude: /soap/i }, shwapno: { include: /palm[- ]oil/i, exclude: /soap|shower|palmolive/i } },
  mustard_oil: { chaldal: { include: /mustard oil/i, exclude: /hair/i }, shwapno: { include: /mustard[- ]oil/i, exclude: /hair/i } },
  atta: {
    chaldal: { include: /\batta\b/i, exclude: /brown|whole|multi|rooti|paratha|red/i },
    shwapno: { include: /\batta\b/i, exclude: /brown|whole|multi|rooti|paratha|red/i },
  },
  rice_fine: { shwapno: { include: /(miniket|najirshail|nazirshail).*rice/i, exclude: /premium|aromatic|puffed|flat/i } },
  rice_coarse: { shwapno: { include: /(swarna|guti|mota|coarse).*rice|rice.*(swarna|mota|coarse)/i } },
  lentil: { shwapno: { include: /(red[- ])?lentil|masur|moshur/i, exclude: /flour|soup|mung|chola|chickpea/i } },
  mung: { shwapno: { include: /mung[- ]dal|moong/i, exclude: /sprout|snack|chanachur/i } },
  sugar: { shwapno: { include: /\bsugar\b.*(1\s?kg|kg)|white[- ]sugar/i, exclude: /free|substitute|brown|cube|icing|biscuit|cracker|zero|drink/i } },
  egg: { shwapno: { include: /\b(brown|farm|layer)[- ]egg/i, exclude: /omega|vitamin|enriched|duck|quail|organic/i } },
};

/** Pack size in the commodity's unit, or null when it can't be read. */
export function packSize(text: string, unit: Commodity["unit"]): number | null {
  const s = text.replace(/±\s*\d+(\.\d+)?\s*(gm|g|kg)/gi, " ").replace(/[()]/g, " ");
  const m = s.match(/(\d+(?:\.\d+)?)\s*(kg|kgs|gm|gram|grams|g|ltr|liter|litre|l|ml|pcs|pc|piece|pieces)\b/i);
  if (m) {
    const n = Number(m[1]);
    const u = m[2].toLowerCase();
    if (unit === "kg") return u.startsWith("kg") ? n : /^(gm|gram|grams|g)$/.test(u) ? n / 1000 : null;
    if (unit === "L") return /^(ltr|liter|litre|l)$/.test(u) ? n : u === "ml" ? n / 1000 : null;
    if (unit === "piece") return /^(pcs|pc|piece|pieces)$/.test(u) ? n : null;
    return null;
  }
  // Loose items sold per kg ("... Loose Premium Kg", "... Per Kg").
  if (unit === "kg" && /\b(per\s+)?kg\b/i.test(s)) return 1;
  return null;
}

export function matches(m: Match | undefined, text: string) {
  return Boolean(m && m.include.test(text) && !(m.exclude && m.exclude.test(text)));
}

export function parseChaldal(html: string): { name: string; size: string; regular: number }[] {
  const h = html.replace(/ data-reactid="[^"]*"/g, "");
  const out: { name: string; size: string; regular: number }[] = [];
  const re = /<div class="textWrapper">([\s\S]*?)<div class="subText"><span>([^<]*)<\/span>/g;
  for (let m; (m = re.exec(h)); ) {
    const block = m[1];
    const name = block.match(/<p class="nameTextWithEllipsis">([^<]*)<\/p>/)?.[1]?.trim();
    // The regular price is always the one inside class="price" (nested inside
    // the discounted block when a discount runs).
    const regular = block.match(/<div class="price"><div class="currency">৳<\/div><span>([\d,.]+)<\/span>/)?.[1];
    if (name && regular) out.push({ name: decode(name), size: decode(m[2].trim()), regular: Number(regular.replace(/,/g, "")) });
  }
  return out;
}

function decode(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"');
}

export function parseShwapno(html: string): { name: string; regular: number } | null {
  const h = html.replace(/\\"/g, '"');
  const block = h.match(/"price":\{("oldPrice"[^}]*|"price":"[^"]*","priceValue"[^}]*)\}/)?.[1];
  const name = h.match(/"productName":"([^"]+)"/)?.[1];
  if (!block || !name) return null;
  const old = block.match(/"oldPriceValue":([\d.]+)/)?.[1];
  const price = block.match(/"priceValue":([\d.]+)/)?.[1];
  const regular = Number(old ?? price);
  return regular > 0 ? { name, regular } : null;
}

