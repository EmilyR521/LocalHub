/** British standard: 0 = Monday, 1 = Tuesday, ... 6 = Sunday */

export interface RunnerPlanBase {
  /** Which weekdays the user can run (0=Mon .. 6=Sun) */
  availableDays: number[];
}

/** Repeated: same distances each week on chosen days; no goal date. */
export interface RunnerPlanRepeated extends RunnerPlanBase {
  mode: 'repeated';
  /** Distance in km for each weekday (0=Mon .. 6=Sun); only entries for selected days matter */
  distancesByDay: Record<number, number>;
  /** Number of weeks to generate in the schedule (e.g. 12) */
  weeksToShow?: number;
}

export type RunnerPlan = RunnerPlanRepeated;

export interface ScheduledRun {
  date: string;
  distanceKm: number;
  title: string;
}

/** Day names Monday first (British standard) */
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function getDayName(day: number): string {
  return DAY_NAMES[day] ?? '';
}

/** JS getDay(): 0=Sun..6=Sat → British 0=Mon..6=Sun */
export function toBritishDay(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Monday of the week for the given date (YYYY-MM-DD). */
export function getWeekMonday(dateStr: string): string {
  const d = parseDate(dateStr);
  const british = toBritishDay(d);
  d.setDate(d.getDate() - british);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Date string (YYYY-MM-DD) for the given week Monday and British weekday (0=Mon .. 6=Sun). */
export function dateFromWeekAndDay(weekMonday: string, dayOfWeek: number): string {
  const d = parseDate(weekMonday);
  d.setDate(d.getDate() + dayOfWeek);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Short label for week (e.g. "17 Feb") */
export function formatWeekLabel(dateStr: string): string {
  const d = parseDate(dateStr);
  const day = d.getDate();
  const month = d.toLocaleDateString('en-GB', { month: 'short' });
  return `${day} ${month}`;
}

export function isRepeated(plan: RunnerPlan): plan is RunnerPlanRepeated {
  return plan.mode === 'repeated';
}

/** JSON format for uploading a smart plan (template download or manual edit). */
export interface RunnerPlanUpload {
  description?: string;
  runs: ScheduledRun[];
}
