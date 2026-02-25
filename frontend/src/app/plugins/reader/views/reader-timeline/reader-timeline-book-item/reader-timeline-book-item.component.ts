import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { Book } from '../../../models/book.model';
import { BookStatus } from '../../../models/book-status.model';
import { BookRating } from '../../../models/book-rating.model';

@Component({
  selector: 'app-reader-timeline-book-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  templateUrl: './reader-timeline-book-item.component.html',
})
export class ReaderTimelineBookItemComponent {
  @Input({ required: true }) book!: Book;
  @Output() viewBook = new EventEmitter<Book>();

  readonly BookStatus = BookStatus;
  readonly BookRating = BookRating;
  imageError = false;

  onItemClick(): void {
    this.viewBook.emit(this.book);
  }

  onImageError(): void {
    this.imageError = true;
  }

  getRatingLabel(rating: BookRating): string {
    switch (rating) {
      case BookRating.Positive:
        return 'Thumbs Up';
      case BookRating.Negative:
        return 'Thumbs Down';
      case BookRating.Favourite:
        return 'Favourite';
      default:
        return '';
    }
  }
}
