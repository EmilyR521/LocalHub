import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

const FREE_DICTIONARY_API = 'https://freedictionaryapi.com/api/v1/entries';

/** Grammar-relevant tags we extract (gender, etc.). */
const GRAMMAR_SENSE_TAGS = new Set([
  'feminine',
  'masculine',
  'neuter',
  'common',
  'singular',
  'plural',
]);

interface FreeDictionarySense {
  definition?: string;
  tags?: string[];
}

interface FreeDictionaryEntry {
  partOfSpeech?: string;
  senses?: FreeDictionarySense[];
}

interface FreeDictionaryResponse {
  word?: string;
  entries?: FreeDictionaryEntry[];
}

export interface DictionaryLookupResult {
  found: boolean;
  tags: string[];
}

/**
 * Calls Free Dictionary API (https://freedictionaryapi.com) to fetch
 * part of speech and gender/grammar tags for a word.
 */
@Injectable({ providedIn: 'root' })
export class VocabulistDictionaryService {
  private http = inject(HttpClient);

  /**
   * Look up a word and return whether it was found plus grammar tags.
   * found is false when the word is not in the dictionary (404 or empty entries) or on error.
   */
  getGrammarTags(languageCode: string, word: string): Observable<DictionaryLookupResult> {
    const lang = languageCode.trim().toLowerCase();
    const encoded = encodeURIComponent(word.trim());
    if (!lang || !encoded || encoded === '%3F') return of({ found: false, tags: [] });

    const url = `${FREE_DICTIONARY_API}/${lang}/${encoded}?translations=true`;
    return this.http.get<FreeDictionaryResponse>(url).pipe(
      map((body) => {
        const entries = body?.entries;
        const found = Array.isArray(entries) && entries.length > 0;
        return { found, tags: this.extractGrammarTags(body) };
      }),
      catchError(() => of({ found: false, tags: [] }))
    );
  }

  private extractGrammarTags(body: FreeDictionaryResponse): string[] {
    const tags = new Set<string>();
    const entries = body?.entries;
    if (!Array.isArray(entries)) return [];

    for (const entry of entries) {
      if (typeof entry.partOfSpeech === 'string' && entry.partOfSpeech.trim()) {
        tags.add(entry.partOfSpeech.trim().toLowerCase());
      }
      const senses = entry.senses;
      if (Array.isArray(senses)) {
        for (const sense of senses) {
          const senseTags = sense.tags;
          if (Array.isArray(senseTags)) {
            for (const t of senseTags) {
              if (typeof t === 'string' && GRAMMAR_SENSE_TAGS.has(t.toLowerCase())) {
                tags.add(t.toLowerCase());
              }
            }
          }
        }
      }
    }
    return [...tags];
  }
}
