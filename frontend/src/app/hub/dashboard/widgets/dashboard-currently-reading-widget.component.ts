import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReaderService } from '../../../plugins/reader/services/reader.service';
import type { Book } from '../../../plugins/reader/models/book.model';
import { BookStatus } from '../../../plugins/reader/models/book-status.model';

@Component({
  selector: 'app-dashboard-currently-reading-widget',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './dashboard-currently-reading-widget.component.html',
})
export class DashboardCurrentlyReadingWidgetComponent implements OnInit {
  private reader = inject(ReaderService);

  readonly currentlyReading = computed(() =>
    this.reader.books().filter((b: Book) => b.status === BookStatus.Reading)
  );

  /** Book IDs whose cover image failed to load. */
  readonly coverErrors = signal<Set<string>>(new Set());

  setCoverError(bookId: string): void {
    this.coverErrors.update((set) => {
      const next = new Set(set);
      next.add(bookId);
      return next;
    });
  }

  hasCoverError(book: Book): boolean {
    return this.coverErrors().has(book.id);
  }

  showCover(book: Book): boolean {
    return Boolean(book.imageUrl) && !this.hasCoverError(book);
  }

  ngOnInit(): void {
    this.reader.load();
  }
}
