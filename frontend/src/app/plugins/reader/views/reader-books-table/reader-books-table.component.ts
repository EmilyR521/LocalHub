import { Component, computed, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { ReaderService } from '../../services/reader.service';
import type { Book } from '../../models/book.model';
import { BookStatus } from '../../models/book-status.model';
import { BookRating } from '../../models/book-rating.model';
import {
  filterBooksByStatusSet,
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
  @Output() filtersApplied = new EventEmitter<void>();

  /** When set (e.g. from stats click), apply filter and emit filtersApplied. */
  @Input() set initialFilter(f: { author?: string; tag?: string } | null) {
    if (f == null) return;
    if (f.author != null) this.authorFilter.set(f.author);
    if (f.tag != null) this.selectedTags.set(new Set([f.tag]));
    this.filtersOpen.set(true);
    this.filtersApplied.emit();
  }

  private reader = inject(ReaderService);

  sortField = signal<BooksSortField>('author');
  sortDir = signal<SortDirection>('asc');

  /** Selected statuses for filter (multiselect). Empty = show all. */
  readonly selectedStatuses = signal<Set<BookStatus>>(new Set());
  /** Selected author for filter. Null = show all. Clicking same author again clears. */
  readonly authorFilter = signal<string | null>(null);
  /** Selected tags for filter (multiselect). Empty = show all. */
  readonly selectedTags = signal<Set<string>>(new Set());
  readonly filtersOpen = signal(false);

  readonly statusOptions: BookStatus[] = Object.values(BookStatus);

  readonly allTags = computed(() => {
    const set = new Set<string>();
    for (const book of this.reader.books()) {
      for (const t of book.tags ?? []) {
        const tag = (t ?? '').trim();
        if (tag) set.add(tag);
      }
    }
    return [...set].sort();
  });

  readonly activeFilterCount = computed(() => {
    return this.selectedTags().size + (this.authorFilter() != null ? 1 : 0) + this.selectedStatuses().size;
  });

  readonly filteredAndSortedBooks = computed(() => {
    let list = filterBooksByStatusSet(
      this.reader.books(),
      this.selectedStatuses()
    );
    const author = this.authorFilter();
    if (author != null) {
      const a = author.toLowerCase().trim();
      list = list.filter((b) => (b.author ?? '').toLowerCase().trim() === a);
    }
    const tags = this.selectedTags();
    if (tags.size > 0) {
      const tagLower = new Set([...tags].map((t) => t.toLowerCase()));
      list = list.filter((b) =>
        (b.tags ?? []).some((t) => tagLower.has((t ?? '').toLowerCase().trim()))
      );
    }
    return sortBooks(list, this.sortField(), this.sortDir());
  });

  onAddBook(): void {
    this.addBook.emit();
  }

  onViewBook(book: Book): void {
    this.viewBook.emit(book);
  }

  toggleStatus(status: BookStatus): void {
    this.selectedStatuses.update((set) => {
      const next = new Set(set);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  isStatusSelected(status: BookStatus): boolean {
    return this.selectedStatuses().has(status);
  }

  /** Apply or clear status filter when clicking status in table (toggle). */
  applyStatusFilter(status: BookStatus): void {
    this.toggleStatus(status);
  }

  /** Apply or clear author filter when clicking author in table (toggle). */
  applyAuthorFilter(author: string): void {
    const key = (author ?? '').trim();
    if (this.authorFilter()?.toLowerCase().trim() === key.toLowerCase()) {
      this.authorFilter.set(null);
    } else {
      this.authorFilter.set(key || null);
    }
  }

  setSort(field: BooksSortField): void {
    if (this.sortField() === field) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
  }

  toggleFilters(): void {
    this.filtersOpen.update((v) => !v);
  }

  toggleTag(tag: string): void {
    this.selectedTags.update((set) => {
      const next = new Set(set);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  isTagSelected(tag: string): boolean {
    return this.selectedTags().has(tag);
  }

  isAuthorFilterActive(author: string): boolean {
    const a = (author ?? '').trim().toLowerCase();
    const f = this.authorFilter();
    return f != null && f.toLowerCase().trim() === a;
  }

  clearAuthorFilter(): void {
    this.authorFilter.set(null);
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
