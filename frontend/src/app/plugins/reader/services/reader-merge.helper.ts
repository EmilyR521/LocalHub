import type { Book } from '../models/book.model';
import type { Collection } from '../models/collection.model';
import { generateId } from './reader-store.constants';

export interface MergeResult {
  newBooks: Book[];
  newCollections: Collection[];
  booksAdded: number;
  collectionsAdded: number;
}

/** Ensure every book has an id and addedDate; returns new array. */
export function ensureBookIds(books: Book[]): Book[] {
  return books.map((b) =>
    b.id
      ? b
      : { ...b, id: generateId(), addedDate: b.addedDate || new Date().toISOString().slice(0, 10) }
  );
}

/** Ensure every collection has an id and createdDate; returns new array. */
export function ensureCollectionIds(collections: Collection[]): Collection[] {
  return collections.map((c) =>
    c.id ? c : { ...c, id: generateId(), createdDate: c.createdDate || new Date().toISOString() }
  );
}

/** Book identity for deduplication: title|author (normalised). */
function bookKey(b: Book): string {
  return `${(b.title || '').toLowerCase().trim()}|${(b.author || '').toLowerCase().trim()}`;
}

/**
 * Merge imported books and collections into existing data.
 * Deduplicates books by title+author; collections by name. Maps collection book ids to new book ids.
 */
export function mergeImport(
  importedBooks: Book[],
  importedCollections: Collection[],
  existingBooks: Book[],
  existingCollections: Collection[]
): MergeResult {
  const existingKeys = new Set(existingBooks.map(bookKey));
  const idMap = new Map<string, string>();
  const toAdd: Book[] = [];

  for (const b of importedBooks) {
    const key = bookKey(b);
    const existingBook = existingBooks.find((e) => bookKey(e) === key);
    if (existingBook) {
      if (b.id) idMap.set(b.id, existingBook.id);
      continue;
    }
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    const newId = generateId();
    if (b.id) idMap.set(b.id, newId);
    toAdd.push({
      ...b,
      id: newId,
      addedDate: b.addedDate || new Date().toISOString().slice(0, 10),
    });
  }

  const newBooks = [...existingBooks, ...toAdd];
  const newBookIds = new Set(newBooks.map((b) => b.id));
  const existingCollNames = new Set(existingCollections.map((c) => c.name.toLowerCase().trim()));
  const newCollections: Collection[] = [...existingCollections];

  for (const c of importedCollections) {
    const nameKey = c.name.toLowerCase().trim();
    if (existingCollNames.has(nameKey)) continue;
    existingCollNames.add(nameKey);
    const mappedBookIds = (c.bookIds || [])
      .map((oldId) => idMap.get(oldId))
      .filter((id): id is string => !!id && newBookIds.has(id));
    newCollections.push({
      id: generateId(),
      name: c.name,
      bookIds: mappedBookIds,
      createdDate: c.createdDate || new Date().toISOString(),
    });
  }

  return {
    newBooks,
    newCollections,
    booksAdded: toAdd.length,
    collectionsAdded: newCollections.length - existingCollections.length,
  };
}
