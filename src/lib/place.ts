import "server-only";

// Reverse geocoding for the optional one-tap GPS fix, via OpenStreetMap
// Nominatim (usage policy: <= 1 request/second, identifying User-Agent,
// attribution). Called at most once per "Use my location" tap.

type NominatimAddress = Partial<Record<"hamlet" | "village" | "town" | "suburb" | "neighbourhood" | "city" | "municipality" | "county" | "state_district", string>>;

export async function villageName(lat: number, lon: number, lang: "en" | "bn"): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&lat=${lat}&lon=${lon}&accept-language=${lang === "bn" ? "bn,en" : "en"}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "KrishiBazarAI/1.0 (https://github.com/sps1590/farmer_and_stocks)" },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { address?: NominatimAddress };
    const a = j.address ?? {};
    return a.hamlet ?? a.village ?? a.neighbourhood ?? a.suburb ?? a.town ?? a.city ?? a.municipality ?? null;
  } catch {
    return null;
  }
}
