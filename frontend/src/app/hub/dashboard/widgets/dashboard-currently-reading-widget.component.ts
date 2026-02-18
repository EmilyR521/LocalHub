import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReaderService } from '../../../plugins/reader/services/reader.service';
import type { Book } from '../../../plugins/reader/models/book.model';
import { BookStatus } from '../../../plugins/reader/models/book-status.model';

@Component({
  selector: 'app-dashboard-currently-reading-widget',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-currently-reading-widget.component.html',
})
export class DashboardCurrentlyReadingWidgetComponent implements OnInit {
  private reader = inject(ReaderService);

  readonly currentlyReading = computed(() =>
    this.reader.books().filter((b: Book) => b.status === BookStatus.Reading)
  );

  ngOnInit(): void {
    this.reader.load();
  }
}
