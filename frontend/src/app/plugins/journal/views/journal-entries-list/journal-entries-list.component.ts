import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { JournalService, type JournalEntry } from '../../services/journal.service';

const SNIPPET_CONTEXT_CHARS = 80;

export interface SearchResult {
  dateKey: string;
  snippet: string;
  matchStart: number;
  matchEnd: number;
}

function buildSnippet(
  content: string,
  query: string,
  contextChars: number = SNIPPET_CONTEXT_CHARS
): { snippet: string; matchStart: number; matchEnd: number } | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const lower = content.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return null;
  const start = Math.max(0, idx - contextChars);
  const end = Math.min(content.length, idx + q.length + contextChars);
  const snippet =
    (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '');
  const matchStart = (start > 0 ? 1 : 0) + idx - start;
  const matchEnd = matchStart + q.length;
  return { snippet, matchStart, matchEnd };
}

@Component({
  selector: 'app-journal-entries-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './journal-entries-list.component.html',
})
export class JournalEntriesListComponent implements OnDestroy {
  private journalService = inject(JournalService);
  private loadDebounce: ReturnType<typeof setTimeout> | null = null;

  readonly entryDates = this.journalService.entryDates;
  readonly searchQuery = signal('');
  readonly allEntriesCache = signal<{ dateKey: string; entry: JournalEntry }[] | null>(null);
  readonly loadingSearch = signal(false);

  /** Search results with snippet and match range for the current query. */
  readonly searchResults = computed((): SearchResult[] => {
    const q = this.searchQuery().trim();
    const cache = this.allEntriesCache();
    if (q.length < 2 || !cache) return [];
    const lower = q.toLowerCase();
    const out: SearchResult[] = [];
    for (const { dateKey, entry } of cache) {
      if (!entry.content) continue;
      const built = buildSnippet(entry.content, q);
      if (built) out.push({ dateKey, ...built });
    }
    return out;
  });

  readonly isSearching = computed(() => this.searchQuery().trim().length >= 2);
  readonly showSearchResults = computed(
    () => this.isSearching() && (this.allEntriesCache() !== null || this.loadingSearch())
  );

  ngOnDestroy(): void {
    if (this.loadDebounce) clearTimeout(this.loadDebounce);
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    const trimmed = value.trim();
    if (trimmed.length < 2) return;
    if (this.allEntriesCache() !== null) return;
    if (this.loadDebounce) clearTimeout(this.loadDebounce);
    this.loadingSearch.set(true);
    this.loadDebounce = setTimeout(() => this.loadEntriesForSearch(), 350);
  }

  loadEntriesForSearch(): void {
    this.loadDebounce = null;
    if (this.allEntriesCache() !== null) return;
    this.loadingSearch.set(true);
    this.journalService.loadAllEntriesContent().subscribe({
      next: (data) => {
        this.allEntriesCache.set(data);
        this.loadingSearch.set(false);
      },
      error: () => this.loadingSearch.set(false),
    });
  }

  /** Format date key for display (e.g. "Monday, 24 February 2025"). */
  formatDate(key: string): string {
    const d = this.parseDateKey(key);
    return d ? d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : key;
  }

  /** Short format for list (e.g. "Mon 24 Feb"). */
  formatDateShort(key: string): string {
    const d = this.parseDateKey(key);
    return d ? d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : key;
  }

  /** Split snippet into [before, match, after] for highlighting. */
  getSnippetParts(result: SearchResult): [string, string, string] {
    const { snippet, matchStart, matchEnd } = result;
    return [
      snippet.slice(0, matchStart),
      snippet.slice(matchStart, matchEnd),
      snippet.slice(matchEnd),
    ];
  }

  private parseDateKey(key: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
    if (!match) return null;
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const d = parseInt(match[3], 10);
    const date = new Date(y, m, d);
    return isNaN(date.getTime()) ? null : date;
  }
}
