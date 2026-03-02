import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GardenerService } from '../../services/gardener.service';
import type { Zone } from '../../models/zone.model';

@Component({
  selector: 'app-zones',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './zones.component.html',
})
export class ZonesComponent {
  private router = inject(Router);
  readonly gardener = inject(GardenerService);

  readonly zones = this.gardener.zones;
  readonly plants = this.gardener.plants;
  readonly panelOpen = signal(false);
  readonly editingZone = signal<Zone | null>(null);

  formName = '';
  formDescription = '';

  openAdd(): void {
    this.editingZone.set(null);
    this.formName = '';
    this.formDescription = '';
    this.panelOpen.set(true);
  }

  openEdit(zone: Zone): void {
    this.editingZone.set(zone);
    this.formName = zone.name;
    this.formDescription = zone.description ?? '';
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.editingZone.set(null);
  }

  save(): void {
    const zone = this.editingZone();
    const name = this.formName.trim();
    if (!name) return;
    if (zone) {
      this.gardener.updateZone(zone.id, { name, description: this.formDescription.trim() || undefined });
    } else {
      this.gardener.addZone({ name, description: this.formDescription.trim() || undefined });
    }
    this.closePanel();
  }

  delete(): void {
    const zone = this.editingZone();
    if (zone) {
      this.gardener.removeZone(zone.id);
      this.closePanel();
    }
  }

  getPlantCountForZone(zoneId: string): number {
    return this.plants().filter((p) => (p.zoneIds ?? []).includes(zoneId)).length;
  }

  viewPlantsInZone(zone: Zone): void {
    this.router.navigate(['/plugins/gardener'], { queryParams: { zone: zone.id } });
  }
}
