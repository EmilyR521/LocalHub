import { Component, OnInit, signal } from '@angular/core';
import { ReaderService } from './services/reader.service';
import { BookFormComponent } from './components/book-form/book-form.component';
import { ReaderSettingsComponent } from './components/reader-settings/reader-settings.component';
import { ReaderCollectionsComponent } from './views/reader-collections/reader-collections.component';
import { ReaderBooksTableComponent } from './views/reader-books-table/reader-books-table.component';
import { ReaderTimelineComponent } from './views/reader-timeline/reader-timeline.component';
import { ReaderStatsComponent } from './views/reader-stats/reader-stats.component';
import { SettingsDrawerHostComponent } from '../../shared/components/settings-drawer-host/settings-drawer-host.component';
import { NavigationBarComponent, type NavigationBarItem } from '../../shared/components/navigation-bar/navigation-bar.component';
import type { Book } from './models/book.model';

@Component({
  selector: 'app-reader',
  standalone: true,
  imports: [
    BookFormComponent,
    ReaderSettingsComponent,
    ReaderCollectionsComponent,
    ReaderBooksTableComponent,
    ReaderTimelineComponent,
    ReaderStatsComponent,
    SettingsDrawerHostComponent,
    NavigationBarComponent,
  ],
  templateUrl: './reader.component.html',
})
export class ReaderComponent implements OnInit {
  readonly readerNavItems: NavigationBarItem[] = [
    { label: 'Timeline', value: 'timeline' },
    { label: 'Books', value: 'books' },
    { label: 'Collections', value: 'collections' },
    { label: 'Stats', value: 'stats' },
  ];

  panelOpen = signal(false);
  editingBook = signal<Book | null>(null);
  activeTab = signal<'books' | 'collections' | 'timeline' | 'stats'>('timeline');

  /** Pending filter to apply when switching to books tab (from stats author/genre click). */
  pendingFilter = signal<{ author?: string; tag?: string } | null>(null);

  constructor(private reader: ReaderService) {}

  navigateToBooksWithFilter(filter: { author?: string; tag?: string }): void {
    this.pendingFilter.set(filter);
    this.activeTab.set('books');
  }

  clearPendingFilters(): void {
    this.pendingFilter.set(null);
  }

  ngOnInit(): void {
    this.reader.load();
  }

  openAdd(): void {
    this.editingBook.set(null);
    this.panelOpen.set(true);
  }

  openEdit(book: Book): void {
    this.editingBook.set(book);
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.editingBook.set(null);
  }

  onSave(payload: Partial<Book> & { title: string; author: string }): void {
    const book = this.editingBook();
    if (book) {
      this.reader.updateBook(book.id, payload);
    } else {
      this.reader.addBook(payload);
    }
    this.closePanel();
  }

  onDelete(): void {
    const book = this.editingBook();
    if (book) {
      this.reader.removeBook(book.id);
      this.closePanel();
    }
  }
}
