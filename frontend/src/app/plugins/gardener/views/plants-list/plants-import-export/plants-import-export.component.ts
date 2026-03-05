import { Component, inject, signal } from '@angular/core';
import { GardenerService } from '../../../services/gardener.service';
import { GardenerImportExportService } from '../../../services/gardener-import-export.service';

@Component({
  selector: 'app-plants-import-export',
  standalone: true,
  templateUrl: './plants-import-export.component.html',
})
export class PlantsImportExportComponent {
  private gardener = inject(GardenerService);
  private importExport = inject(GardenerImportExportService);

  csvLoading = signal(false);

  get plantsCount(): number {
    return this.gardener.plants().length;
  }

  exportCsvTemplate(): void {
    this.importExport.exportToCsv([], false);
  }

  exportCsv(): void {
    this.importExport.exportToCsv(this.gardener.plants(), true);
  }

  onCsvFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.csvLoading.set(true);
    this.importExport
      .importFromCsv(
        file,
        (plant) => this.gardener.addPlant(plant),
        this.gardener.plants()
      )
      .subscribe({
        next: (result) => {
          this.csvLoading.set(false);
          this.showResult('CSV import', result.success, result.errors);
          input.value = '';
        },
        error: (err: Error) => {
          this.csvLoading.set(false);
          alert(`CSV import failed: ${err.message}`);
          input.value = '';
        },
      });
  }

  private showResult(label: string, success: number, errors: string[]): void {
    let msg = `${label}: ${success} plant(s) imported.`;
    if (errors.length > 0) {
      msg += `\n\nSkipped/errors (${errors.length}):\n${errors.slice(0, 10).join('\n')}`;
      if (errors.length > 10) msg += `\n... and ${errors.length - 10} more`;
    }
    alert(msg);
  }
}
