import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { GardenJob, JobMaterial } from '../../../models/garden-job.model';
import type { Zone } from '../../../models/zone.model';
import type { Plant } from '../../../models/plant.model';
import type { JobFormPayload } from './job-form.payload';

@Component({
  selector: 'app-job-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './job-form.component.html',
})
export class JobFormComponent implements OnChanges {
  @Input() job: GardenJob | null = null;
  /** When adding a new job, optionally pre-fill the start date (e.g. from schedule day click). */
  @Input() initialStartDate = '';
  @Input() set zones(value: Zone[]) {
    this.zonesSignal.set(value ?? []);
  }
  @Input() set plants(value: Plant[]) {
    this.plantsSignal.set(value ?? []);
  }

  @Output() save = new EventEmitter<JobFormPayload>();
  @Output() cancel = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  formTitle = '';
  formStartDate = '';
  formEndDate = '';
  formZoneId = '';
  formMaterials: { name: string; cost: string }[] = [{ name: '', cost: '' }];
  readonly formPlantIds = signal<string[]>([]);
  readonly plantSearchInput = signal('');
  readonly plantSearchFocused = signal(false);

  private zonesSignal = signal<Zone[]>([]);
  private plantsSignal = signal<Plant[]>([]);

  ngOnChanges(): void {
    this.initFromJob(this.job);
    if (!this.job && this.initialStartDate) {
      this.formStartDate = this.initialStartDate;
    }
  }

  get isEditMode(): boolean {
    return this.job != null;
  }

  /** Plants that can be added (not already in form, filtered by search). */
  readonly plantsToAdd = computed(() => {
    const list = this.plantsSignal();
    const query = this.plantSearchInput().trim().toLowerCase();
    const selected = new Set(this.formPlantIds());
    return list.filter(
      (p) => !selected.has(p.id) && (query === '' || this.getPlantDisplayName(p).toLowerCase().includes(query))
    );
  });

  /** Selected plants for display (chips), sorted by name. */
  readonly formPlantsForDisplay = computed(() => {
    return this.formPlantIds()
      .map((id) => this.plantsSignal().find((p) => p.id === id))
      .filter((p): p is Plant => p != null)
      .sort((a, b) => this.getPlantDisplayName(a).localeCompare(this.getPlantDisplayName(b)));
  });

  getPlantDisplayName(plant: Plant): string {
    if (plant.variety?.trim()) return `${plant.name} '${plant.variety.trim()}'`;
    return plant.name;
  }

  private initFromJob(j: GardenJob | null): void {
    if (j) {
      this.formTitle = j.title;
      this.formStartDate = j.startDate;
      this.formEndDate = j.endDate ?? '';
      this.formZoneId = j.zoneId ?? '';
      this.formPlantIds.set([...(j.plantIds ?? [])]);
      this.formMaterials = j.materials?.length
        ? j.materials.map((m) => ({ name: m.name, cost: m.cost != null ? String(m.cost) : '' }))
        : [{ name: '', cost: '' }];
    } else {
      this.formTitle = '';
      this.formStartDate = this.initialStartDate || '';
      this.formEndDate = '';
      this.formZoneId = '';
      this.formPlantIds.set([]);
      this.formMaterials = [{ name: '', cost: '' }];
    }
    this.plantSearchInput.set('');
  }

  addPlantToForm(plant: Plant): void {
    this.formPlantIds.update((ids) => (ids.includes(plant.id) ? ids : [...ids, plant.id]));
    this.plantSearchInput.set('');
  }

  removePlantFromForm(plantId: string): void {
    this.formPlantIds.update((ids) => ids.filter((id) => id !== plantId));
  }

  addMaterialRow(): void {
    this.formMaterials = [...this.formMaterials, { name: '', cost: '' }];
  }

  removeMaterialRow(index: number): void {
    if (this.formMaterials.length <= 1) return;
    this.formMaterials = this.formMaterials.filter((_, i) => i !== index);
  }

  onSave(): void {
    const title = this.formTitle.trim();
    if (!title || !this.formStartDate.trim()) return;
    const materials: JobMaterial[] = this.formMaterials
      .filter((m) => m.name.trim())
      .map((m) => ({
        name: m.name.trim(),
        cost: m.cost.trim() !== '' && Number.isFinite(Number(m.cost)) ? Number(m.cost) : undefined,
      }));
    this.save.emit({
      title,
      startDate: this.formStartDate.trim(),
      endDate: this.formEndDate.trim() || undefined,
      zoneId: this.formZoneId.trim() || undefined,
      plantIds: this.formPlantIds(),
      materials: materials.length ? materials : undefined,
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onDelete(): void {
    this.delete.emit();
  }

  get zonesList(): Zone[] {
    return this.zonesSignal();
  }
}
