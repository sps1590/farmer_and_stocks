import "server-only";
import data from "@/data/bd-admin.json";

// Upazila / union lookup (Bangladesh administrative units below district).
// Source: nuhil/bangladesh-geocode (MIT), built by scripts/build-geo.mjs.

export type Upazila = { id: number; d: string; en: string; bn: string };
export type Union = { id: number; u: number; en: string; bn: string };

const UPAZILAS = data.upazilas as Upazila[];
const UNIONS = data.unions as Union[];
const UPAZILA_BY_ID = new Map(UPAZILAS.map((u) => [u.id, u]));
const UNION_BY_ID = new Map(UNIONS.map((u) => [u.id, u]));

const byName = (a: { en: string }, b: { en: string }) => a.en.localeCompare(b.en);

export function upazilasOf(district: string): Upazila[] {
  return UPAZILAS.filter((u) => u.d === district).sort(byName);
}

export function unionsOf(upazilaId: number): Union[] {
  return UNIONS.filter((u) => u.u === upazilaId).sort(byName);
}

export function getUpazila(id: number | null | undefined) {
  return id ? UPAZILA_BY_ID.get(id) : undefined;
}

export function getUnion(id: number | null | undefined) {
  return id ? UNION_BY_ID.get(id) : undefined;
}

/** True when the union belongs to the upazila and the upazila to the district. */
export function isValidChain(district: string, upazilaId?: number | null, unionId?: number | null): boolean {
  if (!upazilaId) return !unionId;
  const up = UPAZILA_BY_ID.get(upazilaId);
  if (!up || up.d !== district) return false;
  if (!unionId) return true;
  return UNION_BY_ID.get(unionId)?.u === upazilaId;
}

/** "Union, Upazila, District" in the user's language, most specific first. */
export function placeLabel(
  device: { district: string; upazila_id: number | null; union_id: number | null; place_name: string | null },
  districtName: string,
  lang: "en" | "bn",
): string {
  const pick = (x?: { en: string; bn: string }) => (x ? (lang === "bn" ? x.bn : x.en) : null);
  return [device.place_name, pick(getUnion(device.union_id)), pick(getUpazila(device.upazila_id)), districtName].filter(Boolean).slice(0, 3).join(", ");
}
