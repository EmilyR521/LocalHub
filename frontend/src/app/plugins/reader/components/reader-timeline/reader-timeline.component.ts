import { Component, OnInit, computed, Output, EventEmitter } from '@angular/core';
import { ReaderService } from '../../services/reader.service';
import { TimelineService, type TimelineGroup } from '../../services/timeline.service';
import { ReaderTimelineHeaderComponent } from './reader-timeline-header/reader-timeline-header.component';
import { ReaderTimelineBookItemComponent } from './reader-timeline-book-item/reader-timeline-book-item.component';
import type { Book } from '../../models/book.model';

@Component({
  selector: 'app-reader-timeline',
  standalone: true,
  imports: [ReaderTimelineHeaderComponent, ReaderTimelineBookItemComponent],
  templateUrl: './reader-timeline.component.html',
})
export class ReaderTimelineComponent implements OnInit {
  readonly books = this.reader.books;
  readonly timelineGroups = computed<TimelineGroup[]>(() =>
    this.timelineService.buildTimeline(this.reader.books())
  );

  @Output() viewBook = new EventEmitter<Book>();

  constructor(
    private reader: ReaderService,
    private timelineService: TimelineService
  ) {}

  ngOnInit(): void {
    this.reader.load();
  }

  onViewBook(book: Book): void {
    this.viewBook.emit(book);
  }
}
