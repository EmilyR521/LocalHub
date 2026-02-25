import { Component, computed, EventEmitter, Output, signal } from '@angular/core';
import { ReaderService } from '../../services/reader.service';
import type { Book } from '../../models/book.model';
import { BookStatus } from '../../models/book-status.model';
import { BookRating } from '../../models/book-rating.model';
import {
  filterBooksByStatus,
  sortBooks,
  type BooksSortField,
  type SortDirection,
} from '../../helpers/reader-books-list.helper';

@Component({
  selector: 'app-reader-books-table',
  standalone: true,
  templateUrl: './reader-books-table.component.html',
})
export class ReaderBooksTableComponent {
  @Output() viewBook = new EventEmitter<Book>();
  @Output() addBook = new EventEmitter<void>();

  statusFilter = signal<BookStatus | ''>('');
  sortField = signal<BooksSortField>('author');
  sortDir = signal<SortDirection>('asc');

  readonly statusOptions: (BookStatus | '')[] = ['', ...Object.values(BookStatus)];

  readonly filteredAndSortedBooks = computed(() => {
    const list = filterBooksByStatus(
      this.reader.books(),
      this.statusFilter()
    );
    return sortBooks(list, this.sortField(), this.sortDir());
  });

  constructor(private reader: ReaderService) {}

  onAddBook(): void {
    this.addBook.emit();
  }

  onViewBook(book: Book): void {
    this.viewBook.emit(book);
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
