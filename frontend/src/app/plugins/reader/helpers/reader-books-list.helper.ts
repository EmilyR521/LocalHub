import type { Book } from '../models/book.model';
import type { BookStatus } from '../models/book-status.model';

export type BooksSortField =
  | 'title'
  | 'author'
  | 'status'
  | 'addedDate'
  | 'readingEndDate';
export type SortDirection = 'asc' | 'desc';

/**
 * Filter books by status. Returns all if status is empty.
 */
export function filterBooksByStatus(
  books: Book[],
  status: BookStatus | ''
): Book[] {
  if (!status) return books;
  return books.filter((b) => b.status === status);
}

/**
 * Filter books by selected statuses. Returns all if the set is empty.
 */
export function filterBooksByStatusSet(
  books: Book[],
  selectedStatuses: Set<BookStatus>
): Book[] {
  if (selectedStatuses.size === 0) return books;
  return books.filter((b) => selectedStatuses.has(b.status));
}

/**
 * Sort books by field and direction. Returns a new sorted array.
 */
export function sortBooks(
  books: Book[],
  field: BooksSortField,
  dir: SortDirection
): Book[] {
  const list = [...books];
  list.sort((a, b) => {
    let aVal: string | number | undefined;
    let bVal: string | number | undefined;
    switch (field) {
      case 'title':
        aVal = a.title?.toLowerCase() ?? '';
        bVal = b.title?.toLowerCase() ?? '';
        break;
      case 'author':
        aVal = a.author?.toLowerCase() ?? '';
        bVal = b.author?.toLowerCase() ?? '';
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      case 'addedDate':
        aVal = a.addedDate ?? '';
        bVal = b.addedDate ?? '';
        break;
      case 'readingEndDate':
        aVal = a.readingEndDate ?? '';
        bVal = b.readingEndDate ?? '';
        break;
      default:
        return 0;
    }
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return dir === 'asc' ? cmp : -cmp;
  });
  return list;
}
