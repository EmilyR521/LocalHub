import { Component, OnInit, inject, signal, computed, effect, HostListener } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RunnerPlanService } from '../../services/runner-plan.service';
import { StravaService } from '../../services/strava.service';
import {
  getDayName,
  getWeekMonday,
  toBritishDay,
  formatWeekLabel,
  parseDate,
  dateFromWeekAndDay,
} from '../../models/runner-plan.model';
import type { ScheduledRun } from '../../models/runner-plan.model';

export interface CalendarRow {
  weekMonday: string;
  weekLabel: string;
  days: (ScheduledRun | null)[];
}

/** Format a Date as YYYY-MM-DD */
function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Add days to a date string (YYYY-MM-DD), return YYYY-MM-DD */
function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateStr(d);
}

@Component({
  selector: 'app-your-plan',
  standalone: true,
  imports: [DecimalPipe, FormsModule],
  templateUrl: './your-plan.component.html',
})
export class YourPlanComponent implements OnInit {
  readonly runnerPlan = inject(RunnerPlanService);
  readonly strava = inject(StravaService);

  readonly editableRuns = signal<ScheduledRun[]>([]);
  /** Week Mondays (YYYY-MM-DD) to show as empty rows (no runs yet). */
  readonly extendedWeekMondays = signal<string[]>([]);
  /** Date (YYYY-MM-DD) of the run cell currently in edit mode, or null for read-only. */
  readonly editingRunDate = signal<string | null>(null);
  /** Right-click context menu: position and the run's date. */
  readonly contextMenu = signal<{ x: number; y: number; date: string } | null>(null);
  readonly dayNames = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: d, label: getDayName(d) }));
  readonly calendarRows = computed(() =>
    this.buildCalendarRows(this.editableRuns(), this.extendedWeekMondays())
  );
  private lastSyncedScheduleVersion = 0;

  /** Today as YYYY-MM-DD for highlighting. */
  readonly todayDateStr = computed(() => formatDateStr(new Date()));

  /** Set of scheduled run dates that have a completed run on Strava (Run activity on that date). */
  readonly completedRunDates = computed(() => {
    const activities = this.strava.activities();
    const set = new Set<string>();
    for (const a of activities) {
      const t = (a.type ?? '').toLowerCase();
      const s = (a.sport_type ?? '').toLowerCase();
      if (t !== 'run' && s !== 'run') continue;
      const dateStr = (a.start_date_local ?? a.start_date ?? '').slice(0, 10);
      if (dateStr) set.add(dateStr);
    }
    return set;
  });

  /** Schedule date range (first Monday to last Sunday) for filtering Strava runs. */
  readonly scheduleRange = computed<{ start: string; end: string } | null>(() => {
    const rows = this.calendarRows();
    if (rows.length === 0) return null;
    const start = rows[0].weekMonday;
    const end = dateFromWeekAndDay(rows[rows.length - 1].weekMonday, 6);
    return { start, end };
  });

  /** Strava runs that fall within the schedule range, by date (summed if multiple per day). Used to show recent runs in empty cells. */
  readonly stravaRunsInScheduleRange = computed(() => {
    const range = this.scheduleRange();
    const activities = this.strava.activities();
    const map = new Map<string, { distanceKm: number }>();
    if (!range) return map;
    for (const a of activities) {
      const t = (a.type ?? '').toLowerCase();
      const s = (a.sport_type ?? '').toLowerCase();
      if (t !== 'run' && s !== 'run') continue;
      const dateStr = (a.start_date_local ?? a.start_date ?? '').slice(0, 10);
      if (!dateStr || dateStr < range.start || dateStr > range.end) continue;
      const distanceKm = (a.distance ?? 0) / 1000;
      const existing = map.get(dateStr);
      if (existing) {
        existing.distanceKm += distanceKm;
      } else {
        map.set(dateStr, { distanceKm });
      }
    }
    return map;
  });

  constructor() {
    effect(() => {
      const s = this.runnerPlan.schedule();
      const ver = this.runnerPlan.scheduleVersion();
      const shouldSync =
        s.length > 0 &&
        (this.editableRuns().length === 0 || ver !== this.lastSyncedScheduleVersion);
      if (shouldSync) {
        this.lastSyncedScheduleVersion = ver;
        this.editableRuns.set(s.map((r) => ({ ...r })));
        this.extendedWeekMondays.set([]);
      }
    });
    effect(() => {
      if (this.strava.connected()) {
        this.strava.loadActivities(1, 100).subscribe();
      }
    });
  }

  private buildCalendarRows(runs: ScheduledRun[], extendedWeeks: string[]): CalendarRow[] {
    const weekSet = new Set<string>();
    for (const r of runs) weekSet.add(getWeekMonday(r.date));
    for (const w of extendedWeeks) weekSet.add(w);
    const weeks = [...weekSet].sort();
    if (weeks.length === 0) return [];
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

  isCellToday(weekMonday: string, dayOfWeek: number): boolean {
    const cellDate = dateFromWeekAndDay(weekMonday, dayOfWeek);
    return cellDate === this.todayDateStr();
  }

  isRunCompleted(date: string): boolean {
    return this.completedRunDates().has(date);
  }

  /** True when a run is scheduled for a past date and there is no Strava run for that date (missed). */
  isRunMissed(date: string): boolean {
    if (this.completedRunDates().has(date)) return false;
    return date < this.todayDateStr();
  }

  /** True when the cell has a run and it is missed (past date with no Strava activity). */
  isCellMissed(run: ScheduledRun | null): boolean {
    return run != null && this.isRunMissed(run.date);
  }

  /** Strava run for this cell date when there is no scheduled run (only within schedule range). */
  getStravaRunForCell(weekMonday: string, dayOfWeek: number): { distanceKm: number } | null {
    const dateStr = dateFromWeekAndDay(weekMonday, dayOfWeek);
    return this.stravaRunsInScheduleRange().get(dateStr) ?? null;
  }

  addWeekAtStart(): void {
    const rows = this.calendarRows();
    const first = rows[0]?.weekMonday;
    const newMon = first
      ? addDays(first, -7)
      : addDays(getWeekMonday(this.todayDateStr()), -7);
    this.extendedWeekMondays.update((m) =>
      m.includes(newMon) ? m : [newMon, ...m]
    );
  }

  addWeekAtEnd(): void {
    const rows = this.calendarRows();
    const last = rows[rows.length - 1]?.weekMonday;
    const newMon = last ? addDays(last, 7) : getWeekMonday(this.todayDateStr());
    this.extendedWeekMondays.update((m) =>
      m.includes(newMon) ? m : [...m, newMon]
    );
  }

  getWeekTotal(row: CalendarRow): number {
    return row.days.reduce((sum, run) => sum + (run?.distanceKm ?? 0), 0);
  }

  /** Sum of km run this week: scheduled runs with a Strava activity + unscheduled Strava runs in the week. */
  getWeekCompletedKm(row: CalendarRow): number {
    let completed = row.days.reduce(
      (sum, run) => sum + (run && this.isRunCompleted(run.date) ? run.distanceKm : 0),
      0
    );
    for (let day = 0; day < 7; day++) {
      if (!row.days[day]) {
        const stravaRun = this.getStravaRunForCell(row.weekMonday, day);
        if (stravaRun) completed += stravaRun.distanceKm;
      }
    }
    return completed;
  }

  /** True when the week has started (completed or in progress). */
  isWeekCompletedOrInProgress(row: CalendarRow): boolean {
    return this.todayDateStr() >= row.weekMonday;
  }

  updateRunDistance(date: string, value: number | string): void {
    const km = typeof value === 'string' ? parseFloat(value) : value;
    const next = this.editableRuns().map((r) =>
      r.date === date
        ? {
            ...r,
            distanceKm:
              Number.isFinite(km) && km > 0 ? Math.round(km * 2) / 2 : r.distanceKm,
            title: `Run ${Number.isFinite(km) && km > 0 ? Math.round(km * 2) / 2 : r.distanceKm} km`,
          }
        : r
    );
    this.editableRuns.set(next);
    this.runnerPlan.setUploadedRuns(next);
  }

  removeRun(date: string): void {
    const next = this.editableRuns().filter((r) => r.date !== date);
    this.editableRuns.set(next);
    this.runnerPlan.setUploadedRuns(next);
    this.editingRunDate.set(null);
    this.contextMenu.set(null);
  }

  onContextMenu(event: MouseEvent, run: ScheduledRun): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenu.set({ x: event.clientX, y: event.clientY, date: run.date });
  }

  contextMenuEdit(date: string): void {
    this.editingRunDate.set(date);
    this.contextMenu.set(null);
  }

  contextMenuDelete(date: string): void {
    this.removeRun(date);
  }

  clearEditMode(): void {
    setTimeout(() => this.editingRunDate.set(null), 100);
  }

  @HostListener('document:click')
  closeContextMenu(): void {
    this.contextMenu.set(null);
  }

  addRun(weekMonday: string, dayOfWeek: number): void {
    const date = dateFromWeekAndDay(weekMonday, dayOfWeek);
    const existing = this.editableRuns().some((r) => r.date === date);
    if (existing) return;
    const distanceKm = 5;
    const run: ScheduledRun = {
      date,
      distanceKm,
      title: `Run ${distanceKm} km`,
    };
    const next = [...this.editableRuns(), run].sort((a, b) => a.date.localeCompare(b.date));
    this.editableRuns.set(next);
    this.runnerPlan.setUploadedRuns(next);
  }

  ngOnInit(): void {
    this.runnerPlan.load();
    this.strava.checkConnection().subscribe(() => {
      if (this.strava.connected()) {
        this.strava.loadActivities(1, 100).subscribe();
      }
    });
  }
}
