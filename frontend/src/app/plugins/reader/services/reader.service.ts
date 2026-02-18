import { Injectable, inject } from '@angular/core';
import type { Book } from '../models/book.model';
import type { Collection } from '../models/collection.model';
import { BookStatus } from '../models/book-status.model';
import { ReaderPersistenceService } from './reader-persistence.service';
import { generateId } from './reader-store.constants';
import {
  ensureBookIds,
  ensureCollectionIds,
  mergeImport,
} from './reader-merge.helper';

/**
 * Facade for reader domain operations. Delegates persistence to ReaderPersistenceService
 * and import/merge logic to reader-merge.helper. Single responsibility: coordinate
 * books/collections CRUD and bulk operations.
 */
@Injectable({ providedIn: 'root' })
export class ReaderService {
  private persistence = inject(ReaderPersistenceService);

  readonly books = this.persistence.books;
  readonly collections = this.persistence.collections;

  load(): void {
    this.persistence.load();
  }

  addBook(book: Partial<Book> & { title: string; author: string }): Book {
    const newBook: Book = {
      ...book,
      id: generateId(),
      addedDate: new Date().toISOString().slice(0, 10),
      title: book.title,
      author: book.author,
      status: book.status ?? BookStatus.ToRead,
    };
    this.persistence.saveBooks([...this.persistence.books(), newBook]);
    return newBook;
  }

  updateBook(id: string, updates: Partial<Book>): void {
    const list = this.persistence.books().map((b) =>
      b.id === id ? { ...b, ...updates } : b
    );
    this.persistence.saveBooks(list);
  }

  removeBook(id: string): void {
    const list = this.persistence.books().filter((b) => b.id !== id);
    this.persistence.saveBooks(list);
    const collections = this.persistence.collections().map((c) => ({
      ...c,
      bookIds: c.bookIds.filter((bid) => bid !== id),
    }));
    this.persistence.saveCollections(collections);
  }

  createCollection(name: string): Collection {
    const newCollection: Collection = {
      id: generateId(),
      name,
      bookIds: [],
      createdDate: new Date().toISOString(),
    };
    this.persistence.saveCollections([
      ...this.persistence.collections(),
      newCollection,
    ]);
    return newCollection;
  }

  addBookToCollection(collectionId: string, bookId: string): void {
    const collections = this.persistence.collections().map((c) => {
      if (c.id !== collectionId || c.bookIds.includes(bookId)) return c;
      return { ...c, bookIds: [...c.bookIds, bookId] };
    });
    this.persistence.saveCollections(collections);
  }

  removeBookFromCollection(collectionId: string, bookId: string): void {
    const collections = this.persistence.collections().map((c) => {
      if (c.id !== collectionId) return c;
      return { ...c, bookIds: c.bookIds.filter((id) => id !== bookId) };
    });
    this.persistence.saveCollections(collections);
  }

  updateCollection(
    id: string,
    updates: Partial<Pick<Collection, 'name' | 'bookIds'>>
  ): void {
    const list = this.persistence.collections().map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    this.persistence.saveCollections(list);
  }

  deleteCollection(id: string): void {
    const list = this.persistence.collections().filter((c) => c.id !== id);
    this.persistence.saveCollections(list);
  }

  /** Replace all books and collections (e.g. JSON import "Replace"). */
  replaceAll(books: Book[], collections: Collection[]): void {
    this.persistence.saveBooks(ensureBookIds(books));
    this.persistence.saveCollections(ensureCollectionIds(collections));
  }

  /**
   * Merge imported books and collections into existing data.
   * Returns counts of books and collections added.
   */
  mergeFromExport(
    importedBooks: Book[],
    importedCollections: Collection[]
  ): { booksAdded: number; collectionsAdded: number } {
    const result = mergeImport(
      importedBooks,
      importedCollections,
      this.persistence.books(),
      this.persistence.collections()
    );
    this.persistence.saveBooks(result.newBooks);
    this.persistence.saveCollections(result.newCollections);
    return {
      booksAdded: result.booksAdded,
      collectionsAdded: result.collectionsAdded,
    };
  }
}
