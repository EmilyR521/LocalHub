import { Component, inject, signal } from '@angular/core';
import { ReaderLookupService, type LookupOptions } from '../../services/reader-lookup.service';

@Component({
  selector: 'app-reader-lookup-settings',
  standalone: true,
  templateUrl: './reader-lookup-settings.component.html',
})
export class ReaderLookupSettingsComponent {
  private lookup = inject(ReaderLookupService);

  lookupOptions = signal<LookupOptions>({ covers: true, publicationDates: true });
  isLookingUp = signal(false);

  toggleCovers(): void {
    this.lookupOptions.update((o) => ({ ...o, covers: !o.covers }));
  }

  togglePublicationDates(): void {
    this.lookupOptions.update((o) => ({ ...o, publicationDates: !o.publicationDates }));
  }

  runLookup(): void {
    const options = this.lookupOptions();
    if (!options.covers && !options.publicationDates) {
      alert('Select at least one option: Covers or Publication dates.');
      return;
    }
    this.isLookingUp.set(true);
    this.lookup.lookupData(options).subscribe({
      next: (result) => {
        this.isLookingUp.set(false);
        let msg = 'Lookup complete.\n\n';
        if (options.covers && result.covers.total > 0) {
          msg += `Covers: ${result.covers.found} of ${result.covers.total} found.\n`;
        }
        if (options.publicationDates && result.publicationDates.total > 0) {
          msg += `Publication dates: ${result.publicationDates.found} of ${result.publicationDates.total} found.`;
        }
        alert(msg.trim());
      },
      error: () => {
        this.isLookingUp.set(false);
        alert('Lookup failed. Try again.');
      },
    });
  }
}
