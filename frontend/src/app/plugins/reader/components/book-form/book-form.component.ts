import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BookStatus } from '../../models/book-status.model';
import { BookRating } from '../../models/book-rating.model';
import type { Book } from '../../models/book.model';
import { ReaderLookupService } from '../../services/reader-lookup.service';

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

  title = '';
  author = '';
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
