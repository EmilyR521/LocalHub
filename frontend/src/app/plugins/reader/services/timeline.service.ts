import { Injectable } from '@angular/core';
import type { Book } from '../models/book.model';
import { BookStatus } from '../models/book-status.model';

export interface TimelineGroup {
  monthLabel: string;
  monthKey: string;
  books: Book[];
  /** Number of books finished in this month (status finished and readingEndDate in this month) */
  finishedCount: number;
}

@Injectable({ providedIn: 'root' })
export class TimelineService {
  /**
   * Build timeline groups from books, filtering out books without reading start dates
   * and grouping by finished date (or most recent month if no finished date).
   */
  buildTimeline(books: Book[]): TimelineGroup[] {
    const booksWithStartDate = books.filter((book) => {
      const startDate = this.getDateValue(book.readingStartDate);
      return startDate !== null;
    });

    const sortedBooks = this.sortBooksForTimeline(booksWithStartDate);
    const mostRecentMonth = this.findMostRecentMonth(sortedBooks);
    const groupsMap = new Map<string, TimelineGroup>();

    sortedBooks.forEach((book) => {
      let dateForGrouping = this.getDateValue(book.readingEndDate);
      if (!dateForGrouping) {
        dateForGrouping = mostRecentMonth || new Date();
      }
      const monthKey = `${dateForGrouping.getFullYear()}-${String(dateForGrouping.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = dateForGrouping.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!groupsMap.has(monthKey)) {
        groupsMap.set(monthKey, { monthKey, monthLabel, books: [], finishedCount: 0 });
      }
      const group = groupsMap.get(monthKey)!;
      group.books.push(book);
      if (book.status === BookStatus.Finished) {
        const endDate = this.getDateValue(book.readingEndDate);
        if (endDate) {
          const endMonthKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
          if (endMonthKey === monthKey) {
            group.finishedCount++;
          }
        }
      }
    });

    return Array.from(groupsMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }

  private findMostRecentMonth(books: Book[]): Date {
    if (books.length === 0) return new Date();
    let mostRecent: Date | null = null;
    books.forEach((book) => {
      const finishedDate = this.getDateValue(book.readingEndDate);
      const startDate = this.getDateValue(book.readingStartDate);
      const dateToConsider = finishedDate || startDate;
      if (dateToConsider) {
        const monthStart = new Date(dateToConsider.getFullYear(), dateToConsider.getMonth(), 1);
        if (!mostRecent || monthStart > mostRecent) mostRecent = monthStart;
      }
    });
    return mostRecent || new Date();
  }

  private sortBooksForTimeline(books: Book[]): Book[] {
    return books.sort((a, b) => {
      const startDateA = this.getDateValue(a.readingStartDate)!;
      const startDateB = this.getDateValue(b.readingStartDate)!;
      const startDiff = startDateB.getTime() - startDateA.getTime();
      if (startDiff !== 0) return startDiff;
      const endDateA = this.getDateValue(a.readingEndDate);
      const endDateB = this.getDateValue(b.readingEndDate);
      if (endDateA && endDateB) return endDateB.getTime() - endDateA.getTime();
      if (endDateA && !endDateB) return -1;
      if (!endDateA && endDateB) return 1;
      return 0;
    });
  }

  private getDateValue(date: string | Date | undefined): Date | null {
    if (!date) return null;
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return isNaN(dateObj.getTime()) ? null : dateObj;
  }
}
