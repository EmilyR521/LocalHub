import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import type { Book } from '../models/book.model';
import { ReaderService } from './reader.service';

interface OpenLibrarySearchResponse {
  numFound: number;
  start: number;
  numFoundExact?: boolean;
  docs: OpenLibraryBook[];
}

interface OpenLibraryBook {
  cover_i?: number;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  key?: string;
  [key: string]: unknown;
}

export interface BookMetadata {
  coverUrl: string | null;
  publicationDate: string | null;
}

export interface BulkLookupResult {
  total: number;
  found: number;
  completed: number;
}

export interface LookupOptions {
  covers: boolean;
  publicationDates: boolean;
}

const OPEN_LIBRARY_API = 'https://openlibrary.org/search.json';
const COVER_BASE_URL = 'https://covers.openlibrary.org/b/id/';
const REQUEST_DELAY_MS = 500;

@Injectable({ providedIn: 'root' })
export class ReaderLookupService {
  private http = inject(HttpClient);
  private reader = inject(ReaderService);

  /**
   * Look up cover URL and publication date from Open Library (no save).
   */
  lookupMetadata(title: string, author: string): Observable<BookMetadata> {
    if (!title?.trim() || !author?.trim()) {
      return of({ coverUrl: null, publicationDate: null });
    }
    return this.search(title.trim(), author.trim()).pipe(
      map((docs) => {
        const book = this.findBestMatch(docs, title.trim());
        if (!book) return { coverUrl: null, publicationDate: null };
        const coverUrl = book.cover_i
          ? `${COVER_BASE_URL}${book.cover_i}-M.jpg`
          : null;
        const publicationDate = book.first_publish_year
          ? `${book.first_publish_year}-01-01`
          : null;
        return { coverUrl, publicationDate };
      }),
      catchError((err) => {
        console.error('Error looking up book metadata:', err);
        return of({ coverUrl: null, publicationDate: null });
      })
    );
  }

  /**
   * Bulk lookup: fetch covers and/or publication dates for books and save via ReaderService.
   */
  lookupData(
    options: LookupOptions
  ): Observable<{ covers: BulkLookupResult; publicationDates: BulkLookupResult }> {
    const books = this.reader.books();
    const result = {
      covers: { total: 0, found: 0, completed: 0 } as BulkLookupResult,
      publicationDates: { total: 0, found: 0, completed: 0 } as BulkLookupResult,
    };

    const observables: Observable<unknown>[] = [];
    let delayIndex = 0;

    if (options.covers) {
      const withoutCovers = books.filter((b) => !b.imageUrl);
      if (withoutCovers.length > 0) {
        result.covers.total = withoutCovers.length;
        observables.push(
          this.runBulkLookups(withoutCovers, (book) =>
            this.lookupAndSaveCover(book.id, book.title, book.author)
          ).pipe(
            map((results) => {
              result.covers.found = results.filter(Boolean).length;
              result.covers.completed = results.length;
              return null;
            })
          )
        );
        delayIndex += withoutCovers.length;
      }
    }

    if (options.publicationDates) {
      const withoutDates = books.filter((b) => !b.publishedDate);
      if (withoutDates.length > 0) {
        result.publicationDates.total = withoutDates.length;
        observables.push(
          this.runBulkLookups(
            withoutDates,
            (book) =>
              this.lookupAndSavePublicationDate(
                book.id,
                book.title,
                book.author
              ),
            delayIndex
          ).pipe(
            map((results) => {
              result.publicationDates.found = results.filter(Boolean).length;
              result.publicationDates.completed = results.length;
              return null;
            })
          )
        );
      }
    }

    if (observables.length === 0) return of(result);
    return forkJoin(observables).pipe(
      map(() => result),
      catchError((err) => {
        console.error('Error during bulk data lookup:', err);
        return of(result);
      })
    );
  }

  private lookupAndSaveCover(
    bookId: string,
    title: string,
    author: string
  ): Observable<string | null> {
    return this.lookupMetadata(title, author).pipe(
      map((m) => {
        if (m.coverUrl) {
          this.reader.updateBook(bookId, { imageUrl: m.coverUrl });
        }
        return m.coverUrl;
      })
    );
  }

  private lookupAndSavePublicationDate(
    bookId: string,
    title: string,
    author: string
  ): Observable<string | null> {
    return this.lookupMetadata(title, author).pipe(
      map((m) => {
        if (m.publicationDate) {
          this.reader.updateBook(bookId, { publishedDate: m.publicationDate });
        }
        return m.publicationDate;
      })
    );
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({
      'User-Agent': 'LocalHub-Reader/1.0',
    });
  }

  private search(title: string, author: string): Observable<OpenLibraryBook[]> {
    const query = `title:"${title}" AND author:"${author}"`;
    const url = `${OPEN_LIBRARY_API}?q=${encodeURIComponent(query)}&limit=5&fields=cover_i,first_publish_year,title,author_name`;
    return this.http
      .get<OpenLibrarySearchResponse>(url, { headers: this.headers() })
      .pipe(map((res) => res.docs || []));
  }

  private findBestMatch(
    docs: OpenLibraryBook[],
    normalizedTitle: string
  ): OpenLibraryBook | null {
    if (!docs?.length) return null;
    const lower = normalizedTitle.toLowerCase();
    const withCover = (d: OpenLibraryBook) =>
      d.title?.toLowerCase().trim() === lower && d.cover_i;
    const exact =
      docs.find(withCover) ??
      docs.find((d) => d.title?.toLowerCase().trim() === lower);
    const fallback = docs.find((d) => d.cover_i) ?? docs[0];
    return exact ?? fallback ?? null;
  }

  private runBulkLookups<T>(
    books: Book[],
    toObservable: (book: Book) => Observable<T | null>,
    startDelayIndex = 0
  ): Observable<(T | null)[]> {
    const lookups = books.map((book, index) =>
      new Observable<T | null>((observer) => {
        setTimeout(() => {
          toObservable(book).subscribe({
            next: (value) => {
              observer.next(value);
              observer.complete();
            },
            error: (err) => {
              console.error('Lookup error:', err);
              observer.next(null);
              observer.complete();
            },
          });
        }, (startDelayIndex + index) * REQUEST_DELAY_MS);
      })
    );
    return forkJoin(lookups);
  }
}
