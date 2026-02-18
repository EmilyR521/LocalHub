/** British standard: 0 = Monday, 1 = Tuesday, ... 6 = Sunday */
export type PlanMode = 'repeated' | 'ramp-up';

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

/** Ramp-up: build from start distance to goal distance on goal date. */
export interface RunnerPlanRampUp extends RunnerPlanBase {
  mode: 'ramp-up';
  /** Weekdays that get the ramping long-run distance (subset of availableDays; 0=Mon .. 6=Sun) */
  longRunDays?: number[];
  /** Goal date (YYYY-MM-DD) – target for the single long run */
  goalDate: string;
  /** Distance in km for the single run on goal date */
  goalDistanceKm: number;
  /** Starting distance in km for week 1 (default 2) */
  startDistanceKm?: number;
}

export type RunnerPlan = RunnerPlanRepeated | RunnerPlanRampUp;

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

export function isRampUp(plan: RunnerPlan): plan is RunnerPlanRampUp {
  return plan.mode === 'ramp-up';
}
