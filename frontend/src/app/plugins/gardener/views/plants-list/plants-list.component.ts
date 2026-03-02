import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GardenerService } from '../../services/gardener.service';
import { getSpeciesImageUrl } from '../../services/gardener-perenual.service';
import type { Plant } from '../../models/plant.model';
import type { Zone } from '../../models/zone.model';
import type { PlantFormPayload } from './plant-form/plant-form.component';
import { PlantFormComponent } from './plant-form/plant-form.component';

@Component({
  selector: 'app-plants-list',
  standalone: true,
  imports: [PlantFormComponent],
  templateUrl: './plants-list.component.html',
})
export class PlantsListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  readonly gardener = inject(GardenerService);

  readonly plants = this.gardener.plants;
  readonly zones = this.gardener.zones;
  readonly selectedZoneIds = signal<Set<string>>(new Set());
  readonly filteredPlants = computed(() => {
    const sel = this.selectedZoneIds();
    const list = this.plants();
    if (sel.size === 0) return list;
    return list.filter((p) => (p.zoneIds ?? []).some((zid) => sel.has(zid)));
  });
  readonly panelOpen = signal(false);
  readonly editingPlant = signal<Plant | null>(null);

  readonly getSpeciesImageUrl = getSpeciesImageUrl;

  ngOnInit(): void {
    const zone = this.route.snapshot.queryParamMap.get('zone');
    if (zone) this.selectedZoneIds.set(new Set([zone]));
  }

  toggleZoneFilter(zoneId: string): void {
    const set = new Set(this.selectedZoneIds());
    if (set.has(zoneId)) set.delete(zoneId);
    else set.add(zoneId);
    this.selectedZoneIds.set(set);
  }

  clearZoneFilter(): void {
    this.selectedZoneIds.set(new Set());
  }

  getZoneNames(plant: Plant): string[] {
    const zoneIds = plant.zoneIds ?? [];
    const zoneList = this.zones();
    return zoneIds.map((id) => zoneList.find((z) => z.id === id)?.name ?? id).filter(Boolean);
  }

  getDisplayCommonName(plant: Plant): string {
    const common = plant.speciesData?.common_name;
    if (common != null && String(common).trim()) return String(common).trim();
    return plant.name;
  }

  /** Show overridden species/variety when set, otherwise base scientific name from Perenual. */
  getDisplayScientificName(plant: Plant): string {
    const override = plant.species?.trim();
    if (override) return override;
    const sn = plant.speciesData?.scientific_name;
    if (sn != null) {
      if (Array.isArray(sn)) return sn.map((s) => String(s).trim()).filter(Boolean).join(', ');
      return String(sn).trim();
    }
    return '';
  }

  openAdd(): void {
    this.editingPlant.set(null);
    this.panelOpen.set(true);
  }

  openEdit(plant: Plant): void {
    this.editingPlant.set(plant);
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.editingPlant.set(null);
  }

  onPlantSave(payload: PlantFormPayload): void {
    const plant = this.editingPlant();
    if (plant) {
      this.gardener.updatePlant(plant.id, payload);
    } else {
      this.gardener.addPlant({
        ...payload,
        addedDate: new Date().toISOString().slice(0, 10),
      });
    }
    this.closePanel();
  }

  onPlantDelete(): void {
    const plant = this.editingPlant();
    if (plant) {
      this.gardener.removePlant(plant.id);
      this.closePanel();
    }
  }
}
