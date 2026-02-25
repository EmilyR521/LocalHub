import { Component, Input } from '@angular/core';
import type { Book } from '../../../models/book.model';
import { BookStatus } from '../../../models/book-status.model';

@Component({
  selector: 'app-reader-timeline-header',
  standalone: true,
  templateUrl: './reader-timeline-header.component.html',
})
export class ReaderTimelineHeaderComponent {
  @Input() books: Book[] = [];

  readonly BookStatus = BookStatus;

  getFinishedCount(): number {
    return this.books.filter((b) => b.status === BookStatus.Finished).length;
  }

  getReadingCount(): number {
    return this.books.filter((b) => b.status === BookStatus.Reading).length;
  }

  getToReadCount(): number {
    return this.books.filter((b) => b.status === BookStatus.ToRead).length;
  }
}
