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
import { GardenerPerenualService, getSpeciesImageUrl, type PerenualSpeciesListItem } from '../../../services/gardener-perenual.service';
import type { Plant, PlantHardiness, PlantLifecycle, PlantSpeciesData } from '../../../models/plant.model';
import { PLANT_HARDINESS_OPTIONS, PLANT_LIFECYCLE_OPTIONS } from '../../../models/plant.model';
import type { Zone } from '../../../models/zone.model';
import {
  perenualHardinessToPlant,
  perenualCycleToPlant,
  perenualCareNotes,
} from '../../../helpers/perenual-mapping.helper';

/** Payload emitted on save (parent adds addedDate for new plants and calls updatePlant/addPlant). */
export interface PlantFormPayload {
  name: string;
  species?: string;
  notes?: string;
  speciesData?: PlantSpeciesData;
  zoneIds?: string[];
  hardiness?: PlantHardiness;
  lifecycle?: PlantLifecycle;
}

@Component({
  selector: 'app-plant-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './plant-form.component.html',
})
export class PlantFormComponent implements OnChanges {
  private perenual = inject(GardenerPerenualService);

  @Input() plant: Plant | null = null;
  @Input() zones: Zone[] = [];

  @Output() save = new EventEmitter<PlantFormPayload>();
  @Output() cancel = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  formName = '';
  formSpecies = '';
  formNotes = '';
  formSpeciesData: PlantSpeciesData | undefined = undefined;
  readonly formZoneIds = signal<string[]>([]);
  formHardiness: PlantHardiness | '' = '';
  formLifecycle: PlantLifecycle | '' = '';

  readonly zoneSearchInput = signal('');
  readonly zoneSearchFocused = signal(false);

  readonly hardinessOptions = PLANT_HARDINESS_OPTIONS;
  readonly lifecycleOptions = PLANT_LIFECYCLE_OPTIONS;
  readonly monthLetters = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const;
  readonly monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  readonly getSpeciesImageUrl = getSpeciesImageUrl;
  readonly speciesSearchResults = signal<PerenualSpeciesListItem[]>([]);
  readonly speciesSearchLoading = signal(false);
  readonly speciesSearchError = signal<string | null>(null);

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
      this.formSpecies = plant.species ?? '';
      this.formNotes = plant.notes ?? '';
      this.formSpeciesData = plant.speciesData;
      this.formZoneIds.set([...(plant.zoneIds ?? [])]);
      this.formHardiness = plant.hardiness ?? '';
      this.formLifecycle = plant.lifecycle ?? '';
    } else {
      this.formName = '';
      this.formSpecies = '';
      this.formNotes = '';
      this.formSpeciesData = undefined;
      this.formZoneIds.set([]);
      this.formHardiness = '';
      this.formLifecycle = '';
    }
    this.zoneSearchInput.set('');
    this.speciesSearchResults.set([]);
    this.speciesSearchError.set(null);
  }

  isPruningMonth(monthIndex: number, pruningMonths: string[] | undefined): boolean {
    if (!pruningMonths?.length) return false;
    const name = this.monthNames[monthIndex];
    return name ? pruningMonths.some((m) => m.trim().toLowerCase() === name.toLowerCase()) : false;
  }

  formatSpeciesArray(arr: string[] | undefined): string {
    if (!arr?.length) return '';
    return arr.map((s) => (typeof s === 'string' ? s : String(s)).trim()).filter(Boolean).join(', ');
  }

  /** Display label for the base Perenual species (common or scientific name). */
  getBaseSpeciesLabel(data: PlantSpeciesData): string {
    if (data.common_name?.trim()) return data.common_name.trim();
    const sci = data.scientific_name;
    if (Array.isArray(sci) && sci.length > 0) return String(sci[0]).trim();
    if (typeof sci === 'string' && sci.trim()) return sci.trim();
    return '—';
  }

  searchSpecies(): void {
    const query = this.formName.trim();
    this.speciesSearchLoading.set(true);
    this.speciesSearchError.set(null);
    this.perenual.searchSpecies(query || ' ', 1).subscribe({
      next: (res) => {
        this.speciesSearchResults.set(res.data ?? []);
        this.speciesSearchLoading.set(false);
        if ((res.data?.length ?? 0) === 0 && query) {
          this.speciesSearchError.set('No species found. Try a different name.');
        }
      },
      error: () => {
        this.speciesSearchError.set('Lookup unavailable. Check that Perenual API is configured.');
        this.speciesSearchLoading.set(false);
      },
    });
  }

  selectSpecies(item: PerenualSpeciesListItem): void {
    this.perenual.getSpeciesDetails(item.id).subscribe((details) => {
      if (details) {
        this.formSpeciesData = details;
        const common = (details.common_name ?? '').trim();
        const scientific = Array.isArray(details.scientific_name)
          ? details.scientific_name.map((s) => String(s).trim()).filter(Boolean).join(', ')
          : String(details.scientific_name ?? '').trim();
        this.formSpecies = scientific || common || String(item.scientific_name?.[0] ?? item.common_name ?? '');
        this.formName = common || this.formName.trim() || scientific;
        const hardiness = perenualHardinessToPlant(details);
        if (hardiness) this.formHardiness = hardiness;
        const lifecycle = perenualCycleToPlant(details);
        if (lifecycle) this.formLifecycle = lifecycle;
        const careNotes = perenualCareNotes(details);
        if (careNotes) {
          this.formNotes = this.formNotes.trim()
            ? `${this.formNotes.trim()}\n\n--- From Perenual ---\n${careNotes}`
            : careNotes;
        }
      } else {
        const sci = Array.isArray(item.scientific_name) ? item.scientific_name[0] : undefined;
        const common = item.common_name ?? '';
        this.formSpeciesData = { id: item.id, common_name: item.common_name, scientific_name: sci };
        this.formSpecies = sci ? String(sci) : common;
        this.formName = common || this.formName.trim() || (sci ? String(sci) : '');
      }
      this.speciesSearchResults.set([]);
    });
  }

  clearSpeciesData(): void {
    this.formSpeciesData = undefined;
    this.formSpecies = '';
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
      species: this.formSpecies.trim() || undefined,
      notes: this.formNotes.trim() || undefined,
      speciesData: this.formSpeciesData,
      zoneIds: zoneIds.length > 0 ? zoneIds : undefined,
      hardiness: this.formHardiness || undefined,
      lifecycle: this.formLifecycle || undefined,
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onDelete(): void {
    this.delete.emit();
  }
}
