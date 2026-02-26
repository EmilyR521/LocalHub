import { Component, computed, inject } from '@angular/core';
import { ReaderService } from '../../services/reader.service';
import { BookStatus } from '../../models/book-status.model';
import type { Book } from '../../models/book.model';

/** Tags treated as category headers; other tags are grouped under Fiction or Non-Fiction. */
const FICTION_HEADER = 'fiction';
const NON_FICTION_HEADER = 'non-fiction';

export interface StatItem {
  name: string;
  count: number;
}

function isHeaderTag(tag: string): boolean {
  const t = tag.toLowerCase().trim();
  return t === FICTION_HEADER || t === NON_FICTION_HEADER;
}

function bookHasHeaderTag(book: { tags?: string[] }, header: string): boolean {
  return (book.tags ?? []).some((t) => (t ?? '').toLowerCase().trim() === header);
}

@Component({
  selector: 'app-reader-stats',
  standalone: true,
  templateUrl: './reader-stats.component.html',
})
export class ReaderStatsComponent {
  private reader = inject(ReaderService);

  readonly finishedBooks = computed<Book[]>(() =>
    this.reader.books().filter((b) => b.status === BookStatus.Finished)
  );

  readonly topAuthors = computed<StatItem[]>(() => {
    const byAuthor = new Map<string, number>();
    for (const book of this.finishedBooks()) {
      const author = (book.author ?? '').trim() || 'Unknown';
      byAuthor.set(author, (byAuthor.get(author) ?? 0) + 1);
    }
    return [...byAuthor.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  });

  readonly topGenresFiction = computed<StatItem[]>(() => {
    const byTag = new Map<string, number>();
    for (const book of this.finishedBooks()) {
      if (!bookHasHeaderTag(book, FICTION_HEADER)) continue;
      for (const tag of book.tags ?? []) {
        const genre = (tag ?? '').trim();
        if (genre && !isHeaderTag(genre)) {
          byTag.set(genre, (byTag.get(genre) ?? 0) + 1);
        }
      }
    }
    return [...byTag.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  });

  readonly topGenresNonFiction = computed<StatItem[]>(() => {
    const byTag = new Map<string, number>();
    for (const book of this.finishedBooks()) {
      if (!bookHasHeaderTag(book, NON_FICTION_HEADER)) continue;
      for (const tag of book.tags ?? []) {
        const genre = (tag ?? '').trim();
        if (genre && !isHeaderTag(genre)) {
          byTag.set(genre, (byTag.get(genre) ?? 0) + 1);
        }
      }
    }
    return [...byTag.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  });
}
