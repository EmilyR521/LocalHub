import { Component } from '@angular/core';
import { ReaderLookupSettingsComponent } from '../reader-lookup-settings/reader-lookup-settings.component';
import { ReaderImportExportComponent } from '../reader-import-export/reader-import-export.component';

@Component({
  selector: 'app-reader-settings',
  standalone: true,
  imports: [ReaderLookupSettingsComponent, ReaderImportExportComponent],
  templateUrl: './reader-settings.component.html',
})
export class ReaderSettingsComponent {}
