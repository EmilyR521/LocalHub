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
 * Author sort key: surname first (last word), then the rest. Single name used as-is.
 * e.g. "John Smith" -> "smith john", "Plato" -> "plato", "J. R. R. Tolkien" -> "tolkien j. r. r."
 */
function authorSortKey(author: string | undefined): string {
  const s = (author ?? '').trim();
  if (!s) return '';
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return s.toLowerCase();
  const surname = parts[parts.length - 1].toLowerCase();
  const rest = parts.slice(0, -1).join(' ').toLowerCase();
  return `${surname} ${rest}`;
}

/**
 * Sort books by field and direction. Returns a new sorted array.
 * Author sort uses surname (last name) first; single-name authors use that name as-is.
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
        aVal = authorSortKey(a.author);
        bVal = authorSortKey(b.author);
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
