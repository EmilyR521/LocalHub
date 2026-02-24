/**
 * Simple SRS ladder (days): 0 -> 1 -> 3 -> 7 -> 14 -> 30 -> 60.
 * Index 0 = new, then 1,2,3,4,5,6 for the steps.
 */
export const SRS_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30, 60];
const MAX_INDEX = SRS_INTERVAL_DAYS.length - 1;

/** Today as YYYY-MM-DD. */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Add days to an ISO date string (YYYY-MM-DD), return YYYY-MM-DD.
 */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Return next interval index: currentIndex 0..6, correct => advance (cap at 6), wrong => 0.
 */
export function nextIntervalIndex(currentIndex: number, correct: boolean): number {
  if (!correct) return 0;
  return Math.min(currentIndex + 1, MAX_INDEX);
}

/**
 * Get current interval index from intervalDays (0, 1, 3, 7, 14, 30, 60).
 */
export function intervalDaysToIndex(intervalDays: number): number {
  const i = SRS_INTERVAL_DAYS.indexOf(intervalDays);
  return i >= 0 ? i : 0;
}
