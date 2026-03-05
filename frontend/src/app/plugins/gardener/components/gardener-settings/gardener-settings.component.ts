import { Component } from '@angular/core';
import { PlantsImportExportComponent } from '../../views/plants-list/plants-import-export/plants-import-export.component';

@Component({
  selector: 'app-gardener-settings',
  standalone: true,
  imports: [PlantsImportExportComponent],
  template: '<app-plants-import-export />',
})
export class GardenerSettingsComponent {}
