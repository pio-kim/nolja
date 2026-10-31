const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// Today's calendar day in Korea, written as YYYY-MM-DD.
export function todayInKorea(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

// Shifts a YYYY-MM-DD calendar day by whole days.
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
