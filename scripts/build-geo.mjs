// Builds src/data/bd-admin.json from the MIT-licensed nuhil/bangladesh-geocode
// dataset (divisions -> districts -> upazilas -> unions, English + Bangla).
// Run: node scripts/build-geo.mjs
import { writeFileSync } from "node:fs";

const BASE = "https://raw.githubusercontent.com/nuhil/bangladesh-geocode/master";

async function table(name) {
  const res = await fetch(`${BASE}/${name}/${name}.json`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const json = await res.json();
  const t = Array.isArray(json) ? json.find((x) => x && x.type === "table") : null;
  return t ? t.data : json;
}

// Dataset English names -> this app's district keys (src/lib/geo.ts).
const DISTRICT_ALIAS = {
  comilla: "cumilla", chattogram: "chattogram", chittagong: "chattogram", coxsbazar: "coxs_bazar",
  brahmanbaria: "brahmanbaria", bogura: "bogura", bogra: "bogura", jessore: "jashore", jashore: "jashore",
  chapainawabganj: "chapai_nawabganj", nawabganj: "chapai_nawabganj", barishal: "barishal", barisal: "barishal",
  netrokona: "netrokona", netrakona: "netrokona", moulvibazar: "moulvibazar", maulvibazar: "moulvibazar",
  jhalakathi: "jhalokati", jhalokati: "jhalokati",
};
const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, "");

const [districts, upazilas, unions] = await Promise.all([table("districts"), table("upazilas"), table("unions")]);

const distKey = new Map();
for (const d of districts) {
  const n = norm(d.name);
  distKey.set(d.id, DISTRICT_ALIAS[n] ?? n);
}

const out = {
  source: "https://github.com/nuhil/bangladesh-geocode (MIT)",
  upazilas: upazilas.map((u) => ({ id: Number(u.id), d: distKey.get(u.district_id), en: u.name.trim(), bn: u.bn_name.trim() })),
  unions: unions.map((u) => ({ id: Number(u.id), u: Number(u.upazilla_id), en: u.name.trim(), bn: u.bn_name.trim() })),
};
writeFileSync(new URL("../src/data/bd-admin.json", import.meta.url), JSON.stringify(out));
console.log(`upazilas ${out.upazilas.length}, unions ${out.unions.length}, districts ${new Set(out.upazilas.map((u) => u.d)).size}`);
