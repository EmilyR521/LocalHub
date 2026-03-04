import { Component, signal } from '@angular/core';
import { ReaderService } from '../../services/reader.service';
import { ReaderImportExportService } from '../../services/reader-import-export.service';

@Component({
  selector: 'app-reader-import-export',
  standalone: true,
  templateUrl: './reader-import-export.component.html',
})
export class ReaderImportExportComponent {
  csvLoading = signal(false);

  constructor(
    private reader: ReaderService,
    private importExport: ReaderImportExportService
  ) {}

  get booksCount(): number {
    return this.reader.books().length;
  }

  get collectionsCount(): number {
    return this.reader.collections().length;
  }

  exportCSVTemplate(): void {
    this.importExport.exportToCSV([], false);
  }

  exportCSV(): void {
    this.importExport.exportToCSV(this.reader.books(), true);
  }

  onCSVFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.csvLoading.set(true);
    this.importExport
      .importFromCSV(file, (book) => this.reader.addBook(book), this.reader.books())
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
    let msg = `${label}: ${success} book(s) imported.`;
    if (errors.length > 0) {
      msg += `\n\nSkipped/errors (${errors.length}):\n${errors.slice(0, 10).join('\n')}`;
      if (errors.length > 10) msg += `\n... and ${errors.length - 10} more`;
    }
    alert(msg);
  }
}
