import { Component, EventEmitter, Input, OnChanges, Output, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BookStatus } from '../../models/book-status.model';
import { BookRating } from '../../models/book-rating.model';
import type { Book } from '../../models/book.model';
import { ReaderLookupService } from '../../services/reader-lookup.service';
import { ReaderService } from '../../services/reader.service';

@Component({
  selector: 'app-book-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './book-form.component.html',
})
export class BookFormComponent implements OnChanges {
  @Input() book: Book | null = null;
  @Output() save = new EventEmitter<Partial<Book> & { title: string; author: string }>();
  @Output() cancel = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  private lookup = inject(ReaderLookupService);
  private reader = inject(ReaderService);

  title = '';
  author = '';
  series: string[] = [];
  newSeries = '';
  status: BookStatus = BookStatus.ToRead;
  rating: BookRating = BookRating.None;
  readingStartDate = '';
  readingEndDate = '';
  publishedDate = '';
  imageUrl = '';
  notes = '';
  tags: string[] = [];
  newTag = '';
  isLookingUp = false;

  /** Unique series names from all books (for quick-add). */
  readonly allSeries = computed(() => {
    const set = new Set<string>();
    for (const book of this.reader.books()) {
      const raw: string | string[] | undefined = book.series;
      if (Array.isArray(raw)) {
        for (const s of raw) {
          const t = (s ?? '').trim();
          if (t) set.add(t);
        }
      } else if (typeof raw === 'string') {
        const s = (raw as string).trim();
        if (s) set.add(s);
      }
    }
    return [...set].sort();
  });

  readonly BookStatus = BookStatus;
  readonly BookRating = BookRating;
  readonly statusOptions = Object.values(BookStatus);

  get isEdit(): boolean {
    return this.book != null;
  }

  ngOnChanges(): void {
    if (this.book) {
      this.title = this.book.title;
      this.author = this.book.author;
      const raw: string | string[] | undefined = this.book.series;
      this.series = Array.isArray(raw) ? [...raw] : typeof raw === 'string' ? [(raw as string).trim()].filter(Boolean) : [];
      this.status = this.book.status;
      this.rating = this.book.rating ?? BookRating.None;
      this.readingStartDate = this.book.readingStartDate?.slice(0, 10) ?? '';
      this.readingEndDate = this.book.readingEndDate?.slice(0, 10) ?? '';
      this.publishedDate = this.book.publishedDate?.slice(0, 10) ?? '';
      this.imageUrl = this.book.imageUrl ?? '';
      this.notes = this.book.notes ?? '';
      this.tags = this.book.tags ? [...this.book.tags] : [];
    } else {
      this.title = '';
      this.author = '';
      this.series = [];
      this.status = BookStatus.ToRead;
      this.rating = BookRating.None;
      this.readingStartDate = '';
      this.readingEndDate = '';
      this.publishedDate = '';
      this.imageUrl = '';
      this.notes = '';
      this.tags = [];
    }
    this.newTag = '';
    this.newSeries = '';
  }

  toggleSeries(name: string): void {
    const t = name.trim();
    if (!t) return;
    if (this.series.includes(t)) {
      this.series = this.series.filter((s) => s !== t);
    } else {
      this.series = [...this.series, t];
    }
  }

  isSeriesSelected(name: string): boolean {
    return this.series.includes(name.trim());
  }

  addSeries(): void {
    const t = this.newSeries.trim();
    if (t && !this.series.includes(t)) {
      this.series = [...this.series, t];
      this.newSeries = '';
    }
  }

  removeSeries(name: string): void {
    this.series = this.series.filter((s) => s !== name);
  }

  lookupMetadata(): void {
    const t = this.title.trim();
    const a = this.author.trim();
    if (!t || !a) return;
    this.isLookingUp = true;
    this.lookup.lookupMetadata(t, a).subscribe({
      next: (m) => {
        if (m.coverUrl) this.imageUrl = m.coverUrl;
        if (m.publicationDate) this.publishedDate = m.publicationDate.slice(0, 10);
        this.isLookingUp = false;
        if (!m.coverUrl && !m.publicationDate) {
          alert('No metadata found for this book. Check title and author or enter manually.');
        }
      },
      error: () => {
        this.isLookingUp = false;
        alert('Lookup failed. Try again.');
      },
    });
  }

  addTag(): void {
    const t = this.newTag.trim();
    if (t && !this.tags.includes(t)) {
      this.tags = [...this.tags, t];
      this.newTag = '';
    }
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter((x) => x !== tag);
  }

  onSubmit(): void {
    if (!this.title.trim() || !this.author.trim()) return;
    this.save.emit({
      title: this.title.trim(),
      author: this.author.trim(),
      series: this.series.length ? this.series : undefined,
      status: this.status,
      rating: this.rating,
      readingStartDate: this.readingStartDate || undefined,
      readingEndDate: this.readingEndDate || undefined,
      publishedDate: this.publishedDate || undefined,
      imageUrl: this.imageUrl || undefined,
      notes: this.notes.trim() || undefined,
      tags: this.tags.length ? this.tags : undefined,
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onDelete(): void {
    this.delete.emit();
  }

  ratingLabel(r: BookRating): string {
    switch (r) {
      case BookRating.Positive:
        return 'Thumbs up';
      case BookRating.Negative:
        return 'Thumbs down';
      case BookRating.Favourite:
        return 'Favourite';
      default:
        return 'None';
    }
  }
}
