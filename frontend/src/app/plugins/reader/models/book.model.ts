import type { BookStatus } from './book-status.model';
import type { BookRating } from './book-rating.model';
import type { BookOwned } from './book-owned.model';

export interface Book {
  id: string;
  title: string;
  author: string;
  addedDate: string;
  status: BookStatus;
  readingStartDate?: string;
  readingEndDate?: string;
  publishedDate?: string;
  notes?: string;
  tags?: string[];
  imageUrl?: string;
  rating?: BookRating;
  owned?: BookOwned;
}
