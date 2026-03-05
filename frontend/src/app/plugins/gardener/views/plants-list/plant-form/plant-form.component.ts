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
import type { Plant } from '../../../models/plant.model';
import type { Zone } from '../../../models/zone.model';

/** Payload emitted on save (parent adds addedDate for new plants and calls updatePlant/addPlant). */
export interface PlantFormPayload {
  name: string;
  variety?: string;
  speciesName?: string;
  lifecycle?: string;
  hardiness?: string;
  watering?: string;
  pruningMonths?: string;
  sowingMonths?: string;
  harvestMonths?: string;
  plantingOutMonths?: string;
  preferredPh?: string;
  imageUrl?: string;
  location?: string;
  notes?: string;
  zoneIds?: string[];
}

@Component({
  selector: 'app-plant-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './plant-form.component.html',
})
export class PlantFormComponent implements OnChanges {
  @Input() plant: Plant | null = null;
  @Input() zones: Zone[] = [];

  @Output() save = new EventEmitter<PlantFormPayload>();
  @Output() cancel = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  formName = '';
  formVariety = '';
  formSpeciesName = '';
  formLifecycle = '';
  formHardiness = '';
  formWatering = '';
  formPruningMonths = '';
  formSowingMonths = '';
  formHarvestMonths = '';
  formPlantingOutMonths = '';
  formPreferredPh = '';
  formImageUrl = '';
  formLocation = '';
  formNotes = '';
  readonly formZoneIds = signal<string[]>([]);

  readonly zoneSearchInput = signal('');
  readonly zoneSearchFocused = signal(false);

  readonly zonesToAdd = computed(() => {
    const zones = this.zones;
    const query = this.zoneSearchInput().trim().toLowerCase();
    const selected = new Set(this.formZoneIds());
    return zones.filter(
      (z) => !selected.has(z.id) && (query === '' || z.name.toLowerCase().includes(query))
    );
  });

  readonly formZonesForDisplay = computed(() => {
    return this.formZoneIds()
      .map((id) => this.zones.find((z) => z.id === id))
      .filter((z): z is Zone => z != null)
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  ngOnChanges(): void {
    this.initFromPlant(this.plant);
  }

  get isEditMode(): boolean {
    return this.plant != null;
  }

  private initFromPlant(plant: Plant | null): void {
    if (plant) {
      this.formName = plant.name;
      this.formVariety = plant.variety ?? '';
      this.formSpeciesName = plant.speciesName ?? '';
      this.formLifecycle = plant.lifecycle ?? '';
      this.formHardiness = plant.hardiness ?? '';
      this.formWatering = plant.watering ?? '';
      this.formPruningMonths = plant.pruningMonths ?? '';
      this.formSowingMonths = plant.sowingMonths ?? '';
      this.formHarvestMonths = plant.harvestMonths ?? '';
      this.formPlantingOutMonths = plant.plantingOutMonths ?? '';
      this.formPreferredPh = plant.preferredPh ?? '';
      this.formImageUrl = plant.imageUrl ?? '';
      this.formLocation = plant.location ?? '';
      this.formNotes = plant.notes ?? '';
      this.formZoneIds.set([...(plant.zoneIds ?? [])]);
    } else {
      this.formName = '';
      this.formVariety = '';
      this.formSpeciesName = '';
      this.formLifecycle = '';
      this.formHardiness = '';
      this.formWatering = '';
      this.formPruningMonths = '';
      this.formSowingMonths = '';
      this.formHarvestMonths = '';
      this.formPlantingOutMonths = '';
      this.formPreferredPh = '';
      this.formImageUrl = '';
      this.formLocation = '';
      this.formNotes = '';
      this.formZoneIds.set([]);
    }
    this.zoneSearchInput.set('');
  }

  addZoneToForm(zone: Zone): void {
    this.formZoneIds.update((ids) =>
      ids.includes(zone.id) ? ids : [...ids, zone.id]
    );
    this.zoneSearchInput.set('');
  }

  removeZoneFromForm(zoneId: string): void {
    this.formZoneIds.update((ids) => ids.filter((id) => id !== zoneId));
  }

  onSave(): void {
    const name = this.formName.trim();
    if (!name) return;
    const zoneIds = this.formZoneIds();
    this.save.emit({
      name,
      variety: this.formVariety.trim() || undefined,
      speciesName: this.formSpeciesName.trim() || undefined,
      lifecycle: this.formLifecycle.trim() || undefined,
      hardiness: this.formHardiness.trim() || undefined,
      watering: this.formWatering.trim() || undefined,
      pruningMonths: this.formPruningMonths.trim() || undefined,
      sowingMonths: this.formSowingMonths.trim() || undefined,
      harvestMonths: this.formHarvestMonths.trim() || undefined,
      plantingOutMonths: this.formPlantingOutMonths.trim() || undefined,
      preferredPh: this.formPreferredPh.trim() || undefined,
      imageUrl: this.formImageUrl.trim() || undefined,
      location: this.formLocation.trim() || undefined,
      notes: this.formNotes.trim() || undefined,
      zoneIds: zoneIds.length > 0 ? zoneIds : undefined,
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onDelete(): void {
    this.delete.emit();
  }
}
