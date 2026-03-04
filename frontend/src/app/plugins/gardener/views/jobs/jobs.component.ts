import { Component, inject, signal, computed } from '@angular/core';
import { GardenerService } from '../../services/gardener.service';
import type { GardenJob } from '../../models/garden-job.model';
import type { Zone } from '../../models/zone.model';
import type { Plant } from '../../models/plant.model';
import { JobFormComponent } from './job-form/job-form.component';
import type { JobFormPayload } from './job-form/job-form.payload';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [JobFormComponent],
  templateUrl: './jobs.component.html',
})
export class JobsComponent {
  readonly gardener = inject(GardenerService);

  readonly jobs = this.gardener.jobs;
  readonly zones = this.gardener.zones;
  readonly plants = this.gardener.plants;
  readonly panelOpen = signal(false);
  readonly editingJob = signal<GardenJob | null>(null);

  /** Jobs sorted by start date (soonest first). */
  readonly sortedJobs = computed(() => {
    const list = [...this.jobs()];
    return list.sort((a, b) => a.startDate.localeCompare(b.startDate));
  });

  openAdd(): void {
    this.editingJob.set(null);
    this.panelOpen.set(true);
  }

  openEdit(job: GardenJob): void {
    this.editingJob.set(job);
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.editingJob.set(null);
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

  getMaterialsSummary(job: GardenJob): string {
    const m = job.materials;
    if (!m?.length) return '—';
    const names = m.map((x) => x.name).join(', ');
    const total = m.reduce((sum, x) => sum + (x.cost ?? 0), 0);
    if (total > 0) return `${names} (total ${total})`;
    return names;
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

  getPlantDisplayName(plant: Plant): string {
    const common = plant.speciesData?.common_name;
    if (common != null && String(common).trim()) return String(common).trim();
    return plant.name;
  }
}
