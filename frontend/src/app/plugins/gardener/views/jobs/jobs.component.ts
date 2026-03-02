import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GardenerService } from '../../services/gardener.service';
import type { GardenJob, JobMaterial } from '../../models/garden-job.model';
import type { Zone } from '../../models/zone.model';
import type { Plant } from '../../models/plant.model';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './jobs.component.html',
})
export class JobsComponent {
  readonly gardener = inject(GardenerService);

  readonly jobs = this.gardener.jobs;
  readonly zones = this.gardener.zones;
  readonly plants = this.gardener.plants;
  readonly panelOpen = signal(false);
  readonly editingJob = signal<GardenJob | null>(null);

  formTitle = '';
  formStartDate = '';
  formEndDate = '';
  formZoneId = '';
  formMaterials: { name: string; cost: string }[] = [{ name: '', cost: '' }];
  readonly formPlantIds = signal<string[]>([]);
  readonly plantSearchInput = signal('');
  readonly plantSearchFocused = signal(false);

  /** Plants that can be added (not already in form, filtered by search). */
  readonly plantsToAdd = computed(() => {
    const list = this.plants();
    const query = this.plantSearchInput().trim().toLowerCase();
    const selected = new Set(this.formPlantIds());
    return list.filter(
      (p) => !selected.has(p.id) && (query === '' || this.getPlantDisplayName(p).toLowerCase().includes(query))
    );
  });

  /** Selected plants for display (chips), sorted by name. */
  readonly formPlantsForDisplay = computed(() => {
    return this.formPlantIds()
      .map((id) => this.plants().find((p) => p.id === id))
      .filter((p): p is Plant => p != null)
      .sort((a, b) => this.getPlantDisplayName(a).localeCompare(this.getPlantDisplayName(b)));
  });

  /** Jobs sorted by start date (soonest first). */
  readonly sortedJobs = computed(() => {
    const list = [...this.jobs()];
    return list.sort((a, b) => a.startDate.localeCompare(b.startDate));
  });

  openAdd(): void {
    this.editingJob.set(null);
    this.formTitle = '';
    this.formStartDate = '';
    this.formEndDate = '';
    this.formZoneId = '';
    this.formPlantIds.set([]);
    this.plantSearchInput.set('');
    this.formMaterials = [{ name: '', cost: '' }];
    this.panelOpen.set(true);
  }

  openEdit(job: GardenJob): void {
    this.editingJob.set(job);
    this.formTitle = job.title;
    this.formStartDate = job.startDate;
    this.formEndDate = job.endDate ?? '';
    this.formZoneId = job.zoneId ?? '';
    this.formPlantIds.set([...(job.plantIds ?? [])]);
    this.plantSearchInput.set('');
    this.formMaterials =
      job.materials?.length ? job.materials.map((m) => ({ name: m.name, cost: m.cost != null ? String(m.cost) : '' })) : [{ name: '', cost: '' }];
    this.panelOpen.set(true);
  }

  addPlantToForm(plant: Plant): void {
    this.formPlantIds.update((ids) => (ids.includes(plant.id) ? ids : [...ids, plant.id]));
    this.plantSearchInput.set('');
  }

  removePlantFromForm(plantId: string): void {
    this.formPlantIds.update((ids) => ids.filter((id) => id !== plantId));
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.editingJob.set(null);
  }

  addMaterialRow(): void {
    this.formMaterials = [...this.formMaterials, { name: '', cost: '' }];
  }

  removeMaterialRow(index: number): void {
    if (this.formMaterials.length <= 1) return;
    this.formMaterials = this.formMaterials.filter((_, i) => i !== index);
  }

  save(): void {
    const job = this.editingJob();
    const title = this.formTitle.trim();
    if (!title || !this.formStartDate.trim()) return;
    const materials: JobMaterial[] = this.formMaterials
      .filter((m) => m.name.trim())
      .map((m) => ({
        name: m.name.trim(),
        cost: m.cost.trim() !== '' && Number.isFinite(Number(m.cost)) ? Number(m.cost) : undefined,
      }));
    const plantIds = this.formPlantIds();
    const payload = {
      title,
      startDate: this.formStartDate.trim(),
      endDate: this.formEndDate.trim() || undefined,
      zoneId: this.formZoneId.trim() || undefined,
      plantIds,
      materials: materials.length ? materials : undefined,
    };
    if (job) {
      this.gardener.updateJob(job.id, payload);
    } else {
      this.gardener.addJob(payload);
    }
    this.closePanel();
  }

  delete(): void {
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

  getTotalCost(job: GardenJob): number {
    return (job.materials ?? []).reduce((sum, x) => sum + (x.cost ?? 0), 0);
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
