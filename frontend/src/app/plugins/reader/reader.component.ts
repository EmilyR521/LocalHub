import { Component, OnInit, computed, signal } from '@angular/core';
import { ReaderService } from './services/reader.service';
import { BookFormComponent } from './components/book-form/book-form.component';
import { ReaderSettingsComponent } from './components/reader-settings/reader-settings.component';
import { ReaderCollectionsComponent } from './components/reader-collections/reader-collections.component';
import { ReaderTimelineComponent } from './components/reader-timeline/reader-timeline.component';
import { SettingsDrawerHostComponent } from '../../shared/components/settings-drawer-host/settings-drawer-host.component';
import type { Book } from './models/book.model';
import { BookStatus } from './models/book-status.model';
import { BookRating } from './models/book-rating.model';
import {
  filterBooksByStatus,
  sortBooks,
  type BooksSortField,
  type SortDirection,
} from './helpers/reader-books-list.helper';

@Component({
  selector: 'app-reader',
  standalone: true,
  imports: [BookFormComponent, ReaderSettingsComponent, ReaderCollectionsComponent, ReaderTimelineComponent, SettingsDrawerHostComponent],
  templateUrl: './reader.component.html',
})
export class ReaderComponent implements OnInit {
  panelOpen = signal(false);
  editingBook = signal<Book | null>(null);
  activeTab = signal<'books' | 'collections' | 'timeline'>('timeline');

  statusFilter = signal<BookStatus | ''>('');
  sortField = signal<BooksSortField>('author');
  sortDir = signal<SortDirection>('asc');

  readonly BookStatus = BookStatus;
  readonly BookRating = BookRating;
  readonly statusOptions: (BookStatus | '')[] = ['', ...Object.values(BookStatus)];

  readonly books = this.reader.books;

  readonly filteredAndSortedBooks = computed(() => {
    const list = filterBooksByStatus(
      this.reader.books(),
      this.statusFilter()
    );
    return sortBooks(list, this.sortField(), this.sortDir());
  });

  constructor(private reader: ReaderService) {}

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

  setStatusFilter(value: BookStatus | ''): void {
    this.statusFilter.set(value);
  }

  setSort(field: BooksSortField): void {
    if (this.sortField() === field) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
  }

  formatDate(iso: string | undefined): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return '—';
    }
  }

  ratingIcon(rating: BookRating | undefined): string {
    if (!rating || rating === BookRating.None) return '';
    if (rating === BookRating.Positive) return '👍';
    if (rating === BookRating.Negative) return '👎';
    if (rating === BookRating.Favourite) return '❤️';
    return '';
  }
}
