// Bangladesh is UTC+6 all year (no DST).

const BD_OFFSET_MS = 6 * 60 * 60 * 1000;

export function bdNow(): Date {
  return new Date(Date.now() + BD_OFFSET_MS);
}

/** Today's date in Bangladesh as YYYY-MM-DD. */
export function bdToday(): string {
  return bdNow().toISOString().slice(0, 10);
}

export function bdHour(): number {
  return bdNow().getUTCHours();
}

/** Check-in slot for the current Bangladesh time: morning / midday / evening. */
export function currentSlot(): 1 | 2 | 3 {
  const h = bdHour();
  if (h < 12) return 1;
  if (h < 17) return 2;
  return 3;
}

/** Which notification slots a device gets for its chosen pushes-per-day. */
export const SLOTS_FOR_COUNT: Record<number, number[]> = { 0: [], 1: [3], 2: [1, 3], 3: [1, 2, 3] };

export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const i = y * 12 + (m - 1) + n;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
}

export function monthsBetween(fromYm: string, toYm: string): number {
  const [y1, m1] = fromYm.split("-").map(Number);
  const [y2, m2] = toYm.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}
