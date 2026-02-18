import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RunnerPlanService, CALENDAR_EVENT_COLORS } from '../services/runner-plan.service';
import {
  getDayName,
  getWeekMonday,
  toBritishDay,
  formatWeekLabel,
  parseDate,
} from '../models/runner-plan.model';
import type { RunnerPlan, RunnerPlanRepeated, RunnerPlanRampUp, ScheduledRun } from '../models/runner-plan.model';

export interface CalendarRow {
  weekMonday: string;
  weekLabel: string;
  days: (ScheduledRun | null)[];
}

@Component({
  selector: 'app-run-planner',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './run-planner.component.html',
})
export class RunPlannerComponent implements OnInit {
  readonly runnerPlan = inject(RunnerPlanService);

  readonly mode = signal<'repeated' | 'ramp-up'>('ramp-up');
  readonly availableDays = signal<number[]>([0, 2, 4]);
  readonly distancesByDay = signal<Record<number, number>>({ 0: 5, 2: 5, 4: 10 });
  readonly weeksToShow = signal(12);

  readonly longRunDays = signal<number[]>([0]);
  readonly goalDate = signal('');
  readonly goalDistanceKm = signal(10);
  readonly startDistanceKm = signal(2);

  readonly calendarStatus = signal<'idle' | 'sending' | 'done' | 'error'>('idle');
  readonly calendarMessage = signal('');

  readonly editableRuns = signal<ScheduledRun[]>([]);
  readonly schedule = computed(() => this.runnerPlan.schedule());
  readonly dayNames = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: d, label: getDayName(d) }));
  readonly calendarEventColors = CALENDAR_EVENT_COLORS;

  readonly calendarRows = computed(() => this.buildCalendarRows(this.editableRuns()));

  constructor() {
    effect(() => {
      const p = this.runnerPlan.plan();
      if (p) {
        this.mode.set(p.mode);
        this.availableDays.set([...p.availableDays]);
        if (p.mode === 'repeated') {
          this.distancesByDay.set({ ...p.distancesByDay });
          this.weeksToShow.set(p.weeksToShow ?? 12);
        } else {
          this.longRunDays.set(
            Array.isArray(p.longRunDays) && p.longRunDays.length > 0
              ? [...p.longRunDays]
              : [Math.min(...p.availableDays)]
          );
          this.goalDate.set(p.goalDate);
          this.goalDistanceKm.set(p.goalDistanceKm);
          this.startDistanceKm.set(p.startDistanceKm ?? 2);
        }
      }
    });
    effect(() => {
      const s = this.runnerPlan.schedule();
      if (s.length > 0 && this.editableRuns().length === 0) {
        this.editableRuns.set(s.map((r) => ({ ...r })));
      }
    });
  }

  private buildCalendarRows(runs: ScheduledRun[]): CalendarRow[] {
    if (runs.length === 0) return [];
    const weekSet = new Set<string>();
    for (const r of runs) weekSet.add(getWeekMonday(r.date));
    const weeks = [...weekSet].sort();
    const rows: CalendarRow[] = weeks.map((weekMonday) => ({
      weekMonday,
      weekLabel: formatWeekLabel(weekMonday),
      days: [null, null, null, null, null, null, null],
    }));
    for (const r of runs) {
      const w = getWeekMonday(r.date);
      const d = toBritishDay(parseDate(r.date));
      const row = rows.find((x) => x.weekMonday === w);
      if (row) row.days[d] = r;
    }
    return rows;
  }

  updateRunDistance(date: string, value: number | string): void {
    const km = typeof value === 'string' ? parseFloat(value) : value;
    const next = this.editableRuns().map((r) =>
      r.date === date
        ? {
            ...r,
            distanceKm: Number.isFinite(km) && km > 0 ? Math.round(km * 2) / 2 : r.distanceKm,
            title: `Run ${Number.isFinite(km) && km > 0 ? Math.round(km * 2) / 2 : r.distanceKm} km`,
          }
        : r
    );
    this.editableRuns.set(next);
  }

  removeRun(date: string): void {
    this.editableRuns.set(this.editableRuns().filter((r) => r.date !== date));
  }

  ngOnInit(): void {
    this.runnerPlan.load();
  }

  toggleDay(day: number): void {
    const next = new Set(this.availableDays());
    if (next.has(day)) next.delete(day);
    else next.add(day);
    this.availableDays.set([...next].sort((a, b) => a - b));
  }

  isDaySelected(day: number): boolean {
    return this.availableDays().includes(day);
  }

  toggleLongRunDay(day: number): void {
    if (!this.availableDays().includes(day)) return;
    const next = new Set(this.longRunDays());
    if (next.has(day)) next.delete(day);
    else next.add(day);
    if (next.size === 0) return;
    this.longRunDays.set([...next].sort((a, b) => a - b));
  }

  isLongRunDay(day: number): boolean {
    return this.availableDays().includes(day) && this.longRunDays().includes(day);
  }

  setDistanceForDay(day: number, km: number | string): void {
    const val = typeof km === 'string' ? parseFloat(km) : km;
    const next = { ...this.distancesByDay() };
    if (Number.isFinite(val) && val > 0) next[day] = val;
    else delete next[day];
    this.distancesByDay.set(next);
  }

  getDistanceForDay(day: number): number {
    return this.distancesByDay()[day] ?? 0;
  }

  generatePlan(): void {
    const plan: RunnerPlan =
      this.mode() === 'repeated'
        ? ({
            mode: 'repeated',
            availableDays: this.availableDays(),
            distancesByDay: { ...this.distancesByDay() },
            weeksToShow: this.weeksToShow(),
          } satisfies RunnerPlanRepeated)
        : ({
            mode: 'ramp-up',
            availableDays: this.availableDays(),
            longRunDays: (() => {
              const filtered = this.longRunDays().filter((d) => this.availableDays().includes(d));
              return filtered.length > 0 ? filtered : [Math.min(...this.availableDays())];
            })(),
            goalDate: this.goalDate() || this.defaultGoalDate(),
            goalDistanceKm: this.goalDistanceKm(),
            startDistanceKm: this.startDistanceKm(),
          } satisfies RunnerPlanRampUp);
    this.runnerPlan.save(plan);
    this.editableRuns.set(this.runnerPlan.schedule().map((r) => ({ ...r })));
  }

  private defaultGoalDate(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  }

  addToCalendar(): void {
    const runs = this.editableRuns();
    if (runs.length === 0) {
      this.calendarMessage.set('No runs in your schedule. Adjust your plan and save.');
      this.calendarStatus.set('error');
      return;
    }
    this.calendarStatus.set('sending');
    this.calendarMessage.set('');
    this.runnerPlan.addRunsToCalendar(runs).subscribe({
      next: (res) => {
        if (res.created > 0 && (res.failed ?? 0) === 0) {
          this.calendarStatus.set('done');
          let msg = `Added ${res.created} run(s) to Google Calendar.`;
          if ((res.previousDeleted ?? 0) > 0) msg += ' Previous runner events were removed.';
          this.calendarMessage.set(msg);
        } else if (res.created > 0) {
          this.calendarStatus.set('done');
          this.calendarMessage.set(`Added ${res.created} run(s). ${res.failed ?? 0} failed.`);
        } else {
          this.calendarStatus.set('error');
          this.calendarMessage.set(res.errors?.[0] ?? 'Could not add to calendar. Connect Google Calendar in Calendar settings.');
        }
      },
      error: (err) => {
        this.calendarStatus.set('error');
        const msg = err?.error?.error ?? err?.message ?? 'Request failed.';
        this.calendarMessage.set(msg === 'Not connected to Google Calendar' ? 'Connect Google Calendar in Calendar settings (Calendar plugin), then try again.' : msg);
      },
    });
  }

  removeFromCalendar(): void {
    const ids = this.runnerPlan.calendarEventIds();
    if (ids.length === 0) {
      this.calendarMessage.set('No runner events on Google Calendar to remove.');
      this.calendarStatus.set('error');
      return;
    }
    this.calendarStatus.set('sending');
    this.calendarMessage.set('');
    this.runnerPlan.removeRunsFromCalendar().subscribe({
      next: (res) => {
        this.calendarStatus.set('done');
        this.calendarMessage.set(`Removed ${res.deleted} run(s) from Google Calendar.`);
      },
      error: (err) => {
        this.calendarStatus.set('error');
        const msg = err?.error?.error ?? err?.message ?? 'Request failed.';
        this.calendarMessage.set(msg === 'Not connected to Google Calendar' ? 'Connect Google Calendar in Calendar settings (Calendar plugin), then try again.' : msg);
      },
    });
  }
}
