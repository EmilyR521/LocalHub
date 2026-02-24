import { Injectable, signal, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { switchMap, tap, map } from 'rxjs/operators';
import { PluginStoreService } from '../../../core/services/plugin-store.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import type { RunnerPlan, RunnerPlanRepeated, RunnerPlanRampUp, ScheduledRun } from '../models/runner-plan.model';
import { isRepeated, isRampUp } from '../models/runner-plan.model';

const CALENDAR_EVENTS_API = '/api/plugins/calendar/google/events';
const CALENDAR_EVENTS_DELETE_API = '/api/plugins/calendar/google/events/delete';

const PLUGIN_ID = 'runner';
const STORE_KEY = 'plan';
const CALENDAR_COLOR_KEY = 'calendarEventColorId';
const CALENDAR_EVENT_IDS_KEY = 'calendarEventIds';

/** Google Calendar event color IDs (1–11) and labels for the UI */
export const CALENDAR_EVENT_COLORS: { id: string; label: string }[] = [
  { id: '1', label: 'Lavender' },
  { id: '2', label: 'Sage' },
  { id: '3', label: 'Grape' },
  { id: '4', label: 'Flamingo' },
  { id: '5', label: 'Banana' },
  { id: '6', label: 'Tangerine' },
  { id: '7', label: 'Peacock' },
  { id: '8', label: 'Graphite' },
  { id: '9', label: 'Blueberry' },
  { id: '10', label: 'Basil' },
  { id: '11', label: 'Tomato' },
];

/** JS getDay(): 0=Sun, 1=Mon, ... 6=Sat. Convert to British 0=Mon .. 6=Sun. */
function toBritishDay(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Round to nearest 0.5 km for suggested runs. */
function roundToHalf(km: number): number {
  return Math.round(km * 2) / 2;
}

/** Next Monday (or today if today is Monday) at 00:00. */
function getNextMonday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function buildSchedule(plan: RunnerPlan): ScheduledRun[] {
  if (isRepeated(plan)) return buildScheduleRepeated(plan);
  if (isRampUp(plan)) return buildScheduleRampUp(plan);
  return [];
}

function buildScheduleRepeated(plan: RunnerPlanRepeated): ScheduledRun[] {
  const { availableDays, distancesByDay, weeksToShow = 12 } = plan;
  const set = new Set(availableDays);
  if (set.size === 0) return [];

  const runs: ScheduledRun[] = [];
  const start = getNextMonday();
  for (let w = 0; w < weeksToShow; w++) {
    for (let d = 0; d < 7; d++) {
      if (!set.has(d)) continue;
      const km = distancesByDay[d];
      if (!Number.isFinite(km) || km <= 0) continue;
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const rounded = roundToHalf(km);
      runs.push({
        date: formatDate(date),
        distanceKm: rounded,
        title: `Run ${rounded} km`,
      });
    }
  }
  runs.sort((a, b) => a.date.localeCompare(b.date));
  return runs;
}

function buildScheduleRampUp(plan: RunnerPlanRampUp): ScheduledRun[] {
  const { availableDays, goalDate, goalDistanceKm, startDistanceKm = 2 } = plan;
  const availableSet = new Set(availableDays);
  if (availableSet.size === 0 || goalDistanceKm <= 0) return [];

  const longRunSet = new Set(
    Array.isArray(plan.longRunDays) && plan.longRunDays.length > 0
      ? plan.longRunDays.filter((d) => availableSet.has(d))
      : [Math.min(...availableDays)]
  );

  const goal = parseDate(goalDate);
  const startMonday = getNextMonday();
  if (startMonday > goal) return [];

  const weekCount = Math.max(1, Math.ceil((goal.getTime() - startMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)));
  const runs: ScheduledRun[] = [];

  for (let w = 0; w < weekCount; w++) {
    const t = weekCount <= 1 ? 1 : (w + 1) / weekCount;
    const weekLongRunKm = startDistanceKm + (goalDistanceKm - startDistanceKm) * t;
    const isGoalWeek = w === weekCount - 1;
    const longRunDistance = isGoalWeek ? goalDistanceKm : roundToHalf(weekLongRunKm);
    const otherRaw = roundToHalf((isGoalWeek ? goalDistanceKm : weekLongRunKm) * 0.5);
    const otherMaxKm = Math.min(otherRaw, 10);
    const easyRunKm = Math.min(otherRaw, 5);

    const firstNonLongRunDay = [0, 1, 2, 3, 4, 5, 6].find((d) => availableSet.has(d) && !longRunSet.has(d));

    const weekStart = new Date(startMonday);
    weekStart.setDate(startMonday.getDate() + w * 7);

    for (let d = 0; d < 7; d++) {
      if (!availableSet.has(d)) continue;
      const runDate = new Date(weekStart);
      runDate.setDate(weekStart.getDate() + d);
      if (runDate > goal) continue;

      let distanceKm: number;
      if (longRunSet.has(d)) {
        distanceKm = longRunDistance;
      } else if (firstNonLongRunDay !== undefined && d === firstNonLongRunDay) {
        distanceKm = easyRunKm;
      } else {
        distanceKm = otherMaxKm;
      }
      runs.push({
        date: formatDate(runDate),
        distanceKm,
        title: `Run ${distanceKm} km`,
      });
    }
  }

  runs.sort((a, b) => a.date.localeCompare(b.date));
  return runs;
}

@Injectable({ providedIn: 'root' })
export class RunnerPlanService {
  private store = inject(PluginStoreService);
  private userProfile = inject(UserProfileService);
  private http = inject(HttpClient);

  readonly plan = signal<RunnerPlan | null>(null);
  /** True after load from store (saved plan) or after user clicks Generate plan. */
  readonly userHasGenerated = signal(false);
  /** Google Calendar event colorId (1–11) for runs added to calendar. */
  readonly eventColorId = signal<string>('9');
  /** Event IDs we created on Google Calendar (so we can delete or replace them). */
  readonly calendarEventIds = signal<string[]>([]);
  private loaded = false;
  private loadRequested = signal(false);

  readonly schedule = signal<ScheduledRun[]>([]);
  private previousUserId: string | undefined;

  constructor() {
    effect(() => {
      const p = this.plan();
      if (p) this.schedule.set(buildSchedule(p));
      else this.schedule.set([]);
    });
    effect(() => {
      const id = this.userProfile.profile().id;
      if (id !== this.previousUserId) {
        this.previousUserId = id;
        this.plan.set(null);
        this.schedule.set([]);
        this.calendarEventIds.set([]);
        this.loaded = false;
      }
    });
    effect(() => {
      const id = this.userProfile.profile().id;
      const requested = this.loadRequested();
      if (id && requested && !this.loaded) this.doLoad(id);
    });
  }

  load(): void {
    if (this.loaded) return;
    this.userProfile.load();
    this.loadRequested.set(true);
  }

  private doLoad(userId: string): void {
    this.store.get<RunnerPlan>(PLUGIN_ID, STORE_KEY, userId).subscribe({
      next: (p) => {
        this.loaded = true;
        this.plan.set(normalizePlan(p));
        this.userHasGenerated.set(true);
        this.store.get<string>(PLUGIN_ID, CALENDAR_COLOR_KEY, userId).subscribe({
          next: (c) => this.eventColorId.set(/^([1-9]|1[01])$/.test(String(c)) ? String(c) : '9'),
        });
        this.store.get<string[]>(PLUGIN_ID, CALENDAR_EVENT_IDS_KEY, userId).subscribe({
          next: (ids) => this.calendarEventIds.set(Array.isArray(ids) ? ids : []),
        });
      },
      error: () => {
        this.loaded = true;
        this.plan.set(defaultPlan());
      },
    });
  }

  setEventColorId(colorId: string): void {
    const id = /^([1-9]|1[01])$/.test(colorId) ? colorId : '9';
    this.eventColorId.set(id);
    const userId = this.userProfile.profile().id;
    if (userId) this.store.put(PLUGIN_ID, CALENDAR_COLOR_KEY, id, userId).subscribe();
  }

  save(plan: RunnerPlan): void {
    const userId = this.userProfile.profile().id;
    if (!userId) return;
    const normalized = normalizePlan(plan);
    this.plan.set(normalized);
    this.userHasGenerated.set(true);
    this.store.put(PLUGIN_ID, STORE_KEY, normalized, userId).subscribe();
  }

  addRunsToCalendar(runs: ScheduledRun[]): Observable<AddToCalendarResult> {
    const userId = this.userProfile.profile().id;
    if (!userId) return of({ created: 0, failed: runs.length, errors: ['Not signed in'] });
    const events = runs.map((r) => ({ date: r.date, title: r.title, description: `Run ${r.distanceKm} km` }));
    const colorId = this.eventColorId();
    const body = colorId ? { events, colorId } : { events };
    const headers = { 'X-User-Id': userId };
    const existingIds = this.calendarEventIds();
    const deleteFirst =
      existingIds.length > 0
        ? this.http.post<{ deleted: number }>(CALENDAR_EVENTS_DELETE_API, { eventIds: existingIds }, { headers })
        : of({ deleted: 0 });
    return deleteFirst.pipe(
      switchMap((delRes) =>
        this.http.post<AddToCalendarResult>(CALENDAR_EVENTS_API, body, { headers }).pipe(
          map((createRes) => ({ ...createRes, previousDeleted: delRes.deleted })),
          tap((res) => {
            const ids = res.createdIds ?? [];
            if (ids.length > 0) {
              this.calendarEventIds.set(ids);
              this.store.put(PLUGIN_ID, CALENDAR_EVENT_IDS_KEY, ids, userId).subscribe();
            }
          })
        )
      )
    );
  }

  removeRunsFromCalendar(): Observable<{ deleted: number }> {
    const userId = this.userProfile.profile().id;
    const ids = this.calendarEventIds();
    if (!userId || ids.length === 0) return of({ deleted: 0 });
    return this.http
      .post<{ deleted: number }>(CALENDAR_EVENTS_DELETE_API, { eventIds: ids }, { headers: { 'X-User-Id': userId } })
      .pipe(
        tap((res) => {
          if (res.deleted >= 0) {
            this.calendarEventIds.set([]);
            this.store.put(PLUGIN_ID, CALENDAR_EVENT_IDS_KEY, [], userId).subscribe();
          }
        })
      );
  }
}

export interface AddToCalendarResult {
  created: number;
  createdIds?: string[];
  failed?: number;
  errors?: string[];
  /** Set when we deleted previous runner events before adding (auto-replace). */
  previousDeleted?: number;
}

function defaultPlan(): RunnerPlan {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return {
    mode: 'ramp-up',
    availableDays: [0, 2, 4],
    longRunDays: [0],
    goalDate: formatDate(d),
    goalDistanceKm: 10,
    startDistanceKm: 2,
  };
}

function normalizePlan(p: unknown): RunnerPlan {
  if (!p || typeof p !== 'object') return defaultPlan();

  const any = p as Record<string, unknown>;
  const availableDays = Array.isArray(any['availableDays'])
    ? (any['availableDays'] as number[]).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    : [0, 2, 4];

  if (any['mode'] === 'repeated') {
    const distancesByDay = typeof any['distancesByDay'] === 'object' && any['distancesByDay'] !== null
      ? (any['distancesByDay'] as Record<number, number>)
      : {};
    const weeksToShow = Number.isFinite(any['weeksToShow']) && (any['weeksToShow'] as number) > 0
      ? Math.round(any['weeksToShow'] as number)
      : 12;
    return { mode: 'repeated', availableDays, distancesByDay, weeksToShow };
  }

  if (any['mode'] === 'ramp-up' || any['goalDate']) {
    const goalDate = typeof any['goalDate'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(any['goalDate'])
      ? any['goalDate']
      : formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    const goalDistanceKm = Number.isFinite(any['goalDistanceKm']) && (any['goalDistanceKm'] as number) > 0
      ? (any['goalDistanceKm'] as number)
      : 10;
    const startDistanceKm = Number.isFinite(any['startDistanceKm']) && (any['startDistanceKm'] as number) >= 0
      ? (any['startDistanceKm'] as number)
      : 2;
    const rawLongRun = Array.isArray(any['longRunDays']) ? (any['longRunDays'] as number[]) : [];
    const longRunDays = rawLongRun.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6 && availableDays.includes(d));
    return {
      mode: 'ramp-up',
      availableDays,
      longRunDays: longRunDays.length > 0 ? longRunDays : [Math.min(...availableDays)],
      goalDate,
      goalDistanceKm,
      startDistanceKm,
    };
  }

  return defaultPlan();
}
