import { Component, computed, EventEmitter, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReaderService } from '../../services/reader.service';
import type { Book } from '../../models/book.model';
import type { Collection } from '../../models/collection.model';
import { BookStatus } from '../../models/book-status.model';

export type CollectionWithBooks = Collection & { books: Book[] };

@Component({
  selector: 'app-reader-collections',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './reader-collections.component.html',
})
export class ReaderCollectionsComponent {
  showCreateModal = signal(false);
  newCollectionName = signal('');
  editingId = signal<string | null>(null);
  editingName = signal('');
  addBookOpenId = signal<string | null>(null);
  addBookSearch = signal('');

  readonly BookStatus = BookStatus;

  readonly collectionsWithBooks = computed<CollectionWithBooks[]>(() => {
    const collections = this.reader.collections();
    const books = this.reader.books();
    return collections.map((c) => ({
      ...c,
      books: c.bookIds
        .map((id) => books.find((b) => b.id === id))
        .filter((b): b is Book => b != null),
    }));
  });

  constructor(private reader: ReaderService) {}

  openCreateModal(): void {
    this.newCollectionName.set('');
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.newCollectionName.set('');
  }

  createCollection(): void {
    const name = this.newCollectionName().trim();
    if (!name) return;
    this.reader.createCollection(name);
    this.closeCreateModal();
  }

  startEdit(c: Collection): void {
    this.editingId.set(c.id);
    this.editingName.set(c.name);
  }

  saveEdit(collectionId: string): void {
    const name = this.editingName().trim();
    if (name) this.reader.updateCollection(collectionId, { name });
    this.editingId.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  deleteCollection(id: string): void {
    if (confirm('Delete this collection? Books are not removed, only the list.')) {
      this.reader.deleteCollection(id);
    }
  }

  availableBooks(collection: CollectionWithBooks): Book[] {
    const ids = new Set(collection.bookIds);
    return this.reader.books().filter((b) => !ids.has(b.id));
  }

  filteredAvailableBooks(collection: CollectionWithBooks): Book[] {
    const list = this.availableBooks(collection);
    const q = this.addBookSearch().toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q)
    );
  }

  openAddBook(collectionId: string): void {
    this.addBookOpenId.set(collectionId);
    this.addBookSearch.set('');
  }

  closeAddBook(): void {
    this.addBookOpenId.set(null);
  }

  addBookToCollection(collectionId: string, bookId: string): void {
    this.reader.addBookToCollection(collectionId, bookId);
    this.closeAddBook();
  }

  removeBookFromCollection(collectionId: string, bookId: string): void {
    this.reader.removeBookFromCollection(collectionId, bookId);
  }

  @Output() viewBook = new EventEmitter<Book>();

  onViewBook(book: Book): void {
    this.viewBook.emit(book);
  }
}
