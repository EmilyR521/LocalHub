import { Component, inject, signal, computed } from '@angular/core';
import { GardenerService } from '../../services/gardener.service';
import type { GardenJob } from '../../models/garden-job.model';
import type { Plant } from '../../models/plant.model';
import { JobFormComponent } from '../jobs/job-form/job-form.component';
import type { JobFormPayload } from '../jobs/job-form/job-form.payload';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number): { date: string; day: number; isCurrentMonth: boolean }[] {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startPad = first.getDay();
  const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];
  const y = year;
  const m = String(month).padStart(2, '0');
  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, month - 1, 1 - (startPad - i));
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ date: dateStr, day: d.getDate(), isCurrentMonth: false });
  }
  for (let d = 1; d <= last.getDate(); d++) {
    const dateStr = `${y}-${m}-${String(d).padStart(2, '0')}`;
    days.push({ date: dateStr, day: d, isCurrentMonth: true });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month, i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ date: dateStr, day: d.getDate(), isCurrentMonth: false });
  }
  return days;
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [JobFormComponent],
  templateUrl: './schedule.component.html',
})
export class ScheduleComponent {
  readonly gardener = inject(GardenerService);

  readonly viewYear = signal(new Date().getFullYear());
  readonly viewMonth = signal(new Date().getMonth() + 1);
  readonly selectedDate = signal<string | null>(null);
  readonly panelOpen = signal(false);
  readonly editingJob = signal<GardenJob | null>(null);

  readonly jobs = this.gardener.jobs;
  readonly zones = this.gardener.zones;
  readonly plants = this.gardener.plants;

  readonly monthLabel = computed(() => {
    const d = new Date(this.viewYear(), this.viewMonth() - 1, 1);
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  });

  readonly calendarDays = computed(() =>
    getDaysInMonth(this.viewYear(), this.viewMonth())
  );

  readonly jobsByDate = computed(() => {
    const map = new Map<string, GardenJob[]>();
    for (const job of this.gardener.jobs()) {
      const start = new Date(job.startDate);
      const end = job.endDate ? new Date(job.endDate) : new Date(job.startDate);
      const dateStr = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = dateStr(new Date(d));
        const list = map.get(key) ?? [];
        list.push(job);
        map.set(key, list);
      }
    }
    for (const [, list] of map) list.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title));
    return map;
  });

  readonly selectedDateJobs = computed(() => {
    const date = this.selectedDate();
    if (!date) return [];
    return this.jobsByDate().get(date) ?? [];
  });

  readonly jobCountByDate = computed(() => {
    const map = new Map<string, number>();
    for (const [date, list] of this.jobsByDate()) {
      map.set(date, list.length);
    }
    return map;
  });

  readonly DAY_NAMES = DAY_NAMES;

  prevMonth(): void {
    let y = this.viewYear();
    let m = this.viewMonth() - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    this.viewMonth.set(m);
    this.viewYear.set(y);
  }

  nextMonth(): void {
    let y = this.viewYear();
    let m = this.viewMonth() + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    this.viewMonth.set(m);
    this.viewYear.set(y);
  }

  selectDate(date: string): void {
    this.selectedDate.set(date);
    this.openAddJob(date);
  }

  openAddJob(initialDate?: string): void {
    this.editingJob.set(null);
    this.panelOpen.set(true);
    this.initialStartDateForForm.set(initialDate ?? this.selectedDate() ?? new Date().toISOString().slice(0, 10));
  }

  /** Passed to job form when adding from schedule (so the form gets the clicked day as start date). */
  readonly initialStartDateForForm = signal('');

  openEditJob(job: GardenJob): void {
    this.editingJob.set(job);
    this.initialStartDateForForm.set('');
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.editingJob.set(null);
    this.initialStartDateForForm.set('');
  }

  onJobSave(payload: JobFormPayload): void {
    const job = this.editingJob();
    if (job) {
      this.gardener.updateJob(job.id, payload);
    } else {
      this.gardener.addJob(payload);
    }
    this.closePanel();
  }

  onJobDelete(): void {
    const job = this.editingJob();
    if (job) {
      this.gardener.removeJob(job.id);
      this.closePanel();
    }
  }

  getZoneName(zoneId: string): string {
    return this.zones().find((z) => z.id === zoneId)?.name ?? zoneId;
  }

  formatPeriod(job: GardenJob): string {
    if (job.endDate && job.endDate !== job.startDate) {
      return `${job.startDate} – ${job.endDate}`;
    }
    return job.startDate;
  }

  getPlantDisplayName(plant: Plant): string {
    if (plant.variety?.trim()) return `${plant.name} '${plant.variety.trim()}'`;
    return plant.name;
  }

  getPlantsSummary(job: GardenJob): string {
    const ids = job.plantIds ?? [];
    if (ids.length === 0) return '—';
    const names = ids
      .map((id) => this.plants().find((p) => p.id === id))
      .filter((p): p is Plant => p != null)
      .map((p) => this.getPlantDisplayName(p));
    return names.length > 0 ? names.join(', ') : '—';
  }
}
