import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RunnerPlanService } from '../../services/runner-plan.service';
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

@Component({
  selector: 'app-your-plan',
  standalone: true,
  imports: [DecimalPipe, FormsModule],
  templateUrl: './your-plan.component.html',
})
export class YourPlanComponent implements OnInit {
  readonly runnerPlan = inject(RunnerPlanService);

  readonly editableRuns = signal<ScheduledRun[]>([]);
  readonly dayNames = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: d, label: getDayName(d) }));
  readonly calendarRows = computed(() => this.buildCalendarRows(this.editableRuns()));
  private lastSyncedScheduleVersion = 0;

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

  getWeekTotal(row: CalendarRow): number {
    return row.days.reduce((sum, run) => sum + (run?.distanceKm ?? 0), 0);
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
  }
}
