import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RunnerPlanService, CALENDAR_EVENT_COLORS, RUNNER_PLAN_TEMPLATE, parseUploadedPlan, buildSchedule } from '../../services/runner-plan.service';
import { getDayName } from '../../models/runner-plan.model';
import type { RunnerPlan } from '../../models/runner-plan.model';

@Component({
  selector: 'app-plan-generator',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './plan-generator.component.html',
})
export class PlanGeneratorComponent implements OnInit {
  readonly runnerPlan = inject(RunnerPlanService);

  readonly mode = signal<'repeated' | 'smart'>('repeated');
  readonly availableDays = signal<number[]>([0, 2, 4]);
  readonly distancesByDay = signal<Record<number, number>>({ 0: 5, 2: 5, 4: 10 });
  readonly weeksToShow = signal(12);

  readonly uploadMessage = signal('');
  readonly uploadError = signal(false);
  readonly uploading = signal(false);

  readonly calendarStatus = signal<'idle' | 'sending' | 'done' | 'error'>('idle');
  readonly calendarMessage = signal('');

  readonly schedule = computed(() => this.runnerPlan.schedule());
  readonly dayNames = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: d, label: getDayName(d) }));
  readonly calendarEventColors = CALENDAR_EVENT_COLORS;

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

  downloadTemplate(): void {
    const json = JSON.stringify(RUNNER_PLAN_TEMPLATE, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'runner-plan-template.json';
    a.click();
    URL.revokeObjectURL(url);
    this.uploadMessage.set('Template downloaded. Fill the "runs" array and upload below, or use a GenAI assistant.');
    this.uploadError.set(false);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.uploading.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        const runs = parseUploadedPlan(json);
        if (runs && runs.length > 0) {
          this.runnerPlan.setUploadedRuns(runs);
          this.uploadMessage.set(`Uploaded ${runs.length} run(s). Open Your plan to view or add to calendar.`);
          this.uploadError.set(false);
        } else {
          this.uploadMessage.set(
            'No valid runs in file. Use the template format: { "runs": [ { "date": "YYYY-MM-DD", "distanceKm": number, "title": "Run X km" } ] }'
          );
          this.uploadError.set(true);
        }
      } catch {
        this.uploadMessage.set('Invalid JSON. Download the template and use that format.');
        this.uploadError.set(true);
      }
      this.uploading.set(false);
    };
    reader.readAsText(file);
  }

  generatePlan(): void {
    const plan: RunnerPlan = {
      mode: 'repeated',
      availableDays: this.availableDays(),
      distancesByDay: { ...this.distancesByDay() },
      weeksToShow: this.weeksToShow(),
    };
    this.runnerPlan.clearUploadedRuns();
    this.runnerPlan.save(plan);
    const runs = buildSchedule(plan);
    if (runs.length > 0) {
      this.runnerPlan.setUploadedRuns(runs);
    }
  }

  addToCalendar(): void {
    const runs = this.runnerPlan.schedule();
    if (runs.length === 0) return;
    this.calendarStatus.set('sending');
    this.calendarMessage.set('');
    this.runnerPlan.addRunsToCalendar(runs).subscribe({
      next: (res) => {
        this.calendarStatus.set(res.errors?.length ? 'error' : 'done');
        if (res.created !== undefined) {
          this.calendarMessage.set(
            res.errors?.length
              ? `Added ${res.created}; ${res.errors.join(' ')}`
              : `Added ${res.created} run(s) to Google Calendar.`
          );
        } else {
          this.calendarMessage.set(res.errors?.join(' ') ?? '');
        }
      },
      error: (err) => {
        this.calendarStatus.set('error');
        this.calendarMessage.set(err?.message ?? 'Failed to add to calendar');
      },
    });
  }

  removeFromCalendar(): void {
    this.calendarStatus.set('sending');
    this.calendarMessage.set('');
    this.runnerPlan.removeRunsFromCalendar().subscribe({
      next: (res) => {
        this.calendarStatus.set('done');
        this.calendarMessage.set(`Removed ${res.deleted} run(s) from calendar.`);
      },
      error: (err) => {
        this.calendarStatus.set('error');
        this.calendarMessage.set(err?.message ?? 'Failed to remove from calendar');
      },
    });
  }
}
