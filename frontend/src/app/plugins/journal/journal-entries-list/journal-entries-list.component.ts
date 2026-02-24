import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JournalService } from '../services/journal.service';

@Component({
  selector: 'app-journal-entries-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './journal-entries-list.component.html',
})
export class JournalEntriesListComponent {
  private journalService = inject(JournalService);

  readonly entryDates = this.journalService.entryDates;

  /** Format date key for display (e.g. "Monday, 24 February 2025"). */
  formatDate(key: string): string {
    const d = this.parseDateKey(key);
    return d ? d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : key;
  }

  /** Short format for list (e.g. "Mon 24 Feb"). */
  formatDateShort(key: string): string {
    const d = this.parseDateKey(key);
    return d ? d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : key;
  }

  private parseDateKey(key: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
    if (!match) return null;
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const d = parseInt(match[3], 10);
    const date = new Date(y, m, d);
    return isNaN(date.getTime()) ? null : date;
  }
}
