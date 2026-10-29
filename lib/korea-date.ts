const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// Today's calendar day in Korea, written as YYYY-MM-DD.
export function todayInKorea(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}
