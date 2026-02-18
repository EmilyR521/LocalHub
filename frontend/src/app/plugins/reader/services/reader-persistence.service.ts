import { Injectable, signal, inject, effect } from '@angular/core';
import { PluginStoreService } from '../../../core/services/plugin-store.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import type { Book } from '../models/book.model';
import type { Collection } from '../models/collection.model';
import { READER_PLUGIN_ID, BOOKS_KEY, COLLECTIONS_KEY } from './reader-store.constants';

/**
 * Responsible only for loading and persisting reader data per user.
 * Holds books/collections signals and performs GET/PUT with the current user id.
 */
@Injectable({ providedIn: 'root' })
export class ReaderPersistenceService {
  private store = inject(PluginStoreService);
  private userProfile = inject(UserProfileService);

  private booksSignal = signal<Book[]>([]);
  private collectionsSignal = signal<Collection[]>([]);
  private loaded = false;
  private loadRequested = signal(false);

  readonly books = this.booksSignal.asReadonly();
  readonly collections = this.collectionsSignal.asReadonly();

  constructor() {
    effect(() => {
      const id = this.userProfile.profile().id;
      const requested = this.loadRequested();
      if (id && requested && !this.loaded) {
        this.loaded = true;
        this.fetchBooksAndCollections(id);
      }
    });
  }

  load(): void {
    if (this.loaded) return;
    this.userProfile.load();
    this.loadRequested.set(true);
  }

  getUserId(): string | undefined {
    return this.userProfile.profile().id;
  }

  saveBooks(books: Book[]): void {
    this.booksSignal.set(books);
    const userId = this.getUserId();
    this.store.put(READER_PLUGIN_ID, BOOKS_KEY, books, userId).subscribe({ error: () => {} });
  }

  saveCollections(collections: Collection[]): void {
    this.collectionsSignal.set(collections);
    const userId = this.getUserId();
    this.store.put(READER_PLUGIN_ID, COLLECTIONS_KEY, collections, userId).subscribe({ error: () => {} });
  }

  private fetchBooksAndCollections(userId: string): void {
    this.store.get<Book[]>(READER_PLUGIN_ID, BOOKS_KEY, userId).subscribe({
      next: (list) => this.booksSignal.set(Array.isArray(list) ? list : []),
      error: () => this.booksSignal.set([]),
    });
    this.store.get<Collection[]>(READER_PLUGIN_ID, COLLECTIONS_KEY, userId).subscribe({
      next: (list) => this.collectionsSignal.set(Array.isArray(list) ? list : []),
      error: () => this.collectionsSignal.set([]),
    });
  }
}
