import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { Book } from '../models/book.model';
import type { Collection } from '../models/collection.model';
import type { ImportResult } from '../models/import-result.model';
import {
  booksToCsv,
  parseCsvHeader,
  parseCsvRow,
} from './reader-csv.parser';

/**
 * Handles file I/O and format conversion for reader import/export.
 * CSV/JSON parsing is delegated to reader-csv.parser and simple JSON.parse.
 */
@Injectable({ providedIn: 'root' })
export class ReaderImportExportService {
  exportToCSV(books: Book[], includeData = true, filename?: string): void {
    const csv = booksToCsv(books, includeData);
    const name =
      filename ??
      (includeData ? 'reading-list.csv' : 'reading-list-template.csv');
    this.download(csv, name, 'text/csv;charset=utf-8;');
  }

  importFromCSV(
    file: File,
    addBook: (book: Partial<Book> & { title: string; author: string }) => Book,
    existingBooks: Book[] = []
  ): Observable<ImportResult> {
    return new Observable((observer) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const csv = (e.target?.result as string) ?? '';
          const result = this.processCsv(csv, addBook, existingBooks);
          observer.next(result);
          observer.complete();
        } catch (err: unknown) {
          observer.error(
            err instanceof Error ? err : new Error('Failed to process CSV')
          );
        }
      };
      reader.onerror = () => observer.error(new Error('Failed to read file'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  exportToJSON(
    books: Book[],
    collections: Collection[],
    filename = 'reader-backup.json'
  ): void {
    const data = {
      metadata: {
        exportedAt: new Date().toISOString(),
        source: 'LocalHub Reader',
      },
      books,
      collections,
    };
    const json = JSON.stringify(data, null, 2);
    this.download(json, filename, 'application/json');
  }

  parseJSONFile(
    file: File
  ): Observable<{ books: Book[]; collections: Collection[] }> {
    return new Observable((observer) => {
      if (
        file.type !== 'application/json' &&
        !file.name.toLowerCase().endsWith('.json')
      ) {
        observer.error(new Error('Please select a valid JSON file.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const text = (e.target?.result as string) ?? '';
          const data = JSON.parse(text);
          if (!Array.isArray(data.books))
            throw new Error('Invalid JSON: books must be an array');
          if (!Array.isArray(data.collections))
            throw new Error('Invalid JSON: collections must be an array');
          observer.next({ books: data.books, collections: data.collections });
          observer.complete();
        } catch (err: unknown) {
          observer.error(
            err instanceof Error ? err : new Error('Invalid JSON format')
          );
        }
      };
      reader.onerror = () =>
        observer.error(new Error('Failed to read file'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  private download(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private processCsv(
    csv: string,
    addBook: (book: Partial<Book> & { title: string; author: string }) => Book,
    existingBooks: Book[]
  ): ImportResult {
    const lines = csv.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      return {
        success: 0,
        errors: ['CSV must have a header row and at least one data row'],
      };
    }

    const headerMap = parseCsvHeader(lines[0]);
    if (!headerMap) {
      return {
        success: 0,
        errors: ['Invalid or missing headers (Title and Author required)'],
      };
    }

    const existingKeys = new Set(
      existingBooks.map(
        (b) =>
          `${(b.title ?? '').toLowerCase().trim()}|${(b.author ?? '').toLowerCase().trim()}`
      )
    );
    const errors: string[] = [];
    let success = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      try {
        const book = parseCsvRow(line, headerMap, i + 1);
        if (!book) continue;
        const key = `${book.title.toLowerCase().trim()}|${book.author.toLowerCase().trim()}`;
        if (existingKeys.has(key)) {
          errors.push(
            `Row ${i + 1}: "${book.title}" by ${book.author} already exists, skipped`
          );
          continue;
        }
        addBook(book);
        existingKeys.add(key);
        success++;
      } catch (e: unknown) {
        errors.push(
          `Row ${i + 1}: ${e instanceof Error ? e.message : 'Invalid data'}`
        );
      }
    }
    return { success, errors };
  }
}
