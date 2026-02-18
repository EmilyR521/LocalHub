/** Shared date formatting for dashboard widgets and similar (e.g. "Mon, 1st Jan"). */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ordinal(n: number): string {
  const s = n % 10;
  const t = n % 100;
  if (s === 1 && t !== 11) return `${n}st`;
  if (s === 2 && t !== 12) return `${n}nd`;
  if (s === 3 && t !== 13) return `${n}rd`;
  return `${n}th`;
}

/** Format as "Mon, 1st Jan". */
export function formatMonDayMonth(date: Date): string {
  const dow = WEEKDAYS[date.getDay()];
  const day = ordinal(date.getDate());
  const month = MONTHS[date.getMonth()];
  return `${dow}, ${day} ${month}`;
}

/** Days from today (positive = future, negative = past). */
export function daysFromToday(ymd: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(ymd + 'T00:00:00');
  return Math.round((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

/** Days between today and date (positive = date is in the past). */
export function daysAgo(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
}

export function todayYMD(): string {
  return new Date().toISOString().slice(0, 10);
}

/** "today" | "in 1 day" | "in N days". */
export function inDaysLabel(ymd: string): string {
  const n = daysFromToday(ymd);
  if (n === 0) return 'today';
  if (n === 1) return 'in 1 day';
  return `in ${n} days`;
}

/** "today" | "1 day ago" | "N days ago". */
export function daysAgoLabel(date: Date): string {
  const n = daysAgo(date);
  if (n === 0) return 'today';
  if (n === 1) return '1 day ago';
  return `${n} days ago`;
}
