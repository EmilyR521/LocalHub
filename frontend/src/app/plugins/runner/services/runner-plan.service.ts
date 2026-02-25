import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { switchMap, tap, map } from 'rxjs/operators';
import { PluginStoreService } from '../../../core/services/plugin-store.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import type { RunnerPlan, RunnerPlanRepeated, RunnerPlanUpload, ScheduledRun } from '../models/runner-plan.model';
import { isRepeated } from '../models/runner-plan.model';

const CALENDAR_EVENTS_API = '/api/plugins/calendar/google/events';
const CALENDAR_EVENTS_DELETE_API = '/api/plugins/calendar/google/events/delete';

const PLUGIN_ID = 'runner';
const STORE_KEY = 'plan';
const UPLOADED_RUNS_KEY = 'uploadedRuns';
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

/** Template JSON for smart plan: download and edit, or use as-is and import. */
export const RUNNER_PLAN_TEMPLATE: RunnerPlanUpload = {
  description:
    'Runner plan import format. Fill the "runs" array. Each run needs: date (YYYY-MM-DD), distanceKm (number), title (e.g. "Run 10 km"). You can provide a custom training plan; dates must be valid and distances in km.',
  runs: [
          { date: '2025-01-01', distanceKm: 5, title: '(EXAMPLE) Easy run' },
        ],
};

function isValidScheduledRun(r: unknown): r is ScheduledRun {
  return (
    r !== null &&
    typeof r === 'object' &&
    typeof (r as ScheduledRun).date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test((r as ScheduledRun).date) &&
    typeof (r as ScheduledRun).distanceKm === 'number' &&
    Number.isFinite((r as ScheduledRun).distanceKm)
  );
}

/** Parse and validate uploaded JSON. Returns runs array or null if invalid. */
export function parseUploadedPlan(json: unknown): ScheduledRun[] | null {
  if (!json || typeof json !== 'object') return null;
  const obj = json as Record<string, unknown>;
  let runs = obj['runs'];
  if (Array.isArray(runs)) {
    const result: ScheduledRun[] = [];
    for (const r of runs) {
      if (!r || typeof r !== 'object') continue;
      const rec = r as Record<string, unknown>;
      const date = typeof rec['date'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rec['date']) ? rec['date'] : null;
      const distanceKm = typeof rec['distanceKm'] === 'number' && Number.isFinite(rec['distanceKm']) && rec['distanceKm'] > 0 ? rec['distanceKm'] : null;
      const title = typeof rec['title'] === 'string' ? rec['title'].trim() : null;
      if (date && distanceKm !== null) {
        result.push({
          date,
          distanceKm: Math.round(distanceKm * 2) / 2,
          title: title || `Run ${Math.round(distanceKm * 2) / 2} km`,
        });
      }
    }
    return result.length > 0 ? result.sort((a, b) => a.date.localeCompare(b.date)) : null;
  }
  if (Array.isArray(json)) {
    const result: ScheduledRun[] = [];
    for (const r of json) {
      if (!r || typeof r !== 'object') continue;
      const rec = r as Record<string, unknown>;
      const date = typeof rec['date'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rec['date']) ? rec['date'] : null;
      const distanceKm = typeof rec['distanceKm'] === 'number' && Number.isFinite(rec['distanceKm']) && rec['distanceKm'] > 0 ? rec['distanceKm'] : null;
      const title = typeof rec['title'] === 'string' ? rec['title'].trim() : null;
      if (date && distanceKm !== null) {
        result.push({
          date,
          distanceKm: Math.round(distanceKm * 2) / 2,
          title: title || `Run ${Math.round(distanceKm * 2) / 2} km`,
        });
      }
    }
    return result.length > 0 ? result.sort((a, b) => a.date.localeCompare(b.date)) : null;
  }
  return null;
}

@Injectable({ providedIn: 'root' })
export class RunnerPlanService {
  private store = inject(PluginStoreService);
  private userProfile = inject(UserProfileService);
  private http = inject(HttpClient);

  readonly plan = signal<RunnerPlan | null>(null);
  /** Uploaded runs (from JSON import). When set, schedule() returns these instead of generated from plan. */
  readonly uploadedRuns = signal<ScheduledRun[] | null>(null);
  /** Incremented when uploaded runs are set so the planner can sync editableRuns. */
  readonly scheduleVersion = signal(0);
  /** True after load from store, Generate plan, or Upload plan. */
  readonly userHasGenerated = signal(false);
  /** Google Calendar event colorId (1–11) for runs added to calendar. */
  readonly eventColorId = signal<string>('9');
  /** Event IDs we created on Google Calendar (so we can delete or replace them). */
  readonly calendarEventIds = signal<string[]>([]);
  private loaded = false;
  private loadRequested = signal(false);

  /** Current schedule: uploaded runs if any, otherwise generated from plan. */
  readonly schedule = computed(() => {
    const uploaded = this.uploadedRuns();
    if (uploaded && uploaded.length > 0) return uploaded;
    const p = this.plan();
    return p ? buildSchedule(p) : [];
  });
  private previousUserId: string | undefined;

  constructor() {
    effect(() => {
      const id = this.userProfile.profile().id;
      if (id !== this.previousUserId) {
        this.previousUserId = id;
        this.plan.set(null);
        this.uploadedRuns.set(null);
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
        this.plan.set(normalizePlan(p));
        this.store.get<ScheduledRun[]>(PLUGIN_ID, UPLOADED_RUNS_KEY, userId).subscribe({
          next: (runs) => {
            if (Array.isArray(runs) && runs.length > 0 && runs.every(isValidScheduledRun)) {
              this.uploadedRuns.set(runs);
            }
          },
        });
        this.store.get<string>(PLUGIN_ID, CALENDAR_COLOR_KEY, userId).subscribe({
          next: (c) => this.eventColorId.set(/^([1-9]|1[01])$/.test(String(c)) ? String(c) : '9'),
        });
        this.store.get<string[]>(PLUGIN_ID, CALENDAR_EVENT_IDS_KEY, userId).subscribe({
          next: (ids) => this.calendarEventIds.set(Array.isArray(ids) ? ids : []),
        });
        this.loaded = true;
        this.userHasGenerated.set(true);
      },
      error: () => {
        this.plan.set(defaultPlan());
        this.loaded = true;
      },
    });
  }

  /** Set schedule from uploaded JSON. Replaces any generated schedule until next Generate. */
  setUploadedRuns(runs: ScheduledRun[]): void {
    const userId = this.userProfile.profile().id;
    this.uploadedRuns.set(runs);
    this.scheduleVersion.update((v) => v + 1);
    this.userHasGenerated.set(true);
    if (userId) this.store.put(PLUGIN_ID, UPLOADED_RUNS_KEY, runs, userId).subscribe();
  }

  /** Clear uploaded runs so schedule comes from plan again. */
  clearUploadedRuns(): void {
    const userId = this.userProfile.profile().id;
    this.uploadedRuns.set(null);
    this.scheduleVersion.update((v) => v + 1);
    if (userId) this.store.put(PLUGIN_ID, UPLOADED_RUNS_KEY, [], userId).subscribe();
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
  return {
    mode: 'repeated',
    availableDays: [0, 2, 4],
    distancesByDay: { 0: 5, 2: 5, 4: 10 },
    weeksToShow: 12,
  };
}

function normalizePlan(p: unknown): RunnerPlan {
  if (!p || typeof p !== 'object') return defaultPlan();
  const any = p as Record<string, unknown>;
  if (any['mode'] !== 'repeated') return defaultPlan();

  const availableDays = Array.isArray(any['availableDays'])
    ? (any['availableDays'] as number[]).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    : [0, 2, 4];

  const distancesByDay =
    typeof any['distancesByDay'] === 'object' && any['distancesByDay'] !== null
      ? (any['distancesByDay'] as Record<number, number>)
      : {};
  const weeksToShow =
    Number.isFinite(any['weeksToShow']) && (any['weeksToShow'] as number) > 0
      ? Math.round(any['weeksToShow'] as number)
      : 12;
  return { mode: 'repeated', availableDays, distancesByDay, weeksToShow };
}
