import { Injectable, inject, computed } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { switchMap, tap, delay } from 'rxjs/operators';
import type { VocabWord } from '../models/word.model';
import { VocabulistPersistenceService } from './vocabulist-persistence.service';
import { VocabulistDictionaryService } from './vocabulist-dictionary.service';
import { mapDuolingoToVocabWords, type DuolingoExport } from './duolingo-import.helper';
import {
  addDays,
  todayKey,
  nextIntervalIndex,
  intervalDaysToIndex,
  SRS_INTERVAL_DAYS,
} from './srs.helper';
import { generateId } from './vocabulist-store.constants';

/**
 * Facade for vocabulist: languages, words, CRUD, import, SRS.
 */
export type ImportEnrichProgress =
  | { stage: 'enriching'; total: number; done: number }
  | { stage: 'done'; imported: number; total: number }
  | { stage: 'error'; message: string };

@Injectable({ providedIn: 'root' })
export class VocabulistService {
  private persistence = inject(VocabulistPersistenceService);
  private dictionary = inject(VocabulistDictionaryService);

  readonly languages = this.persistence.languages;
  readonly defaultLanguage = this.persistence.defaultLanguage;
  readonly currentLanguage = this.persistence.currentLanguage;
  readonly words = this.persistence.words;

  readonly dueWords = computed(() => {
    const list = this.persistence.words();
    const today = todayKey();
    return list.filter(
      (w) => !w.nextDue || w.nextDue <= today
    );
  });

  load(): void {
    this.persistence.load();
  }

  setCurrentLanguage(code: string | null): void {
    this.persistence.setCurrentLanguage(code);
  }

  setDefaultLanguage(code: string | null): void {
    this.persistence.setDefaultLanguage(code);
  }

  /** Save a new language order (e.g. after reordering in settings). */
  reorderLanguages(ordered: string[]): void {
    this.persistence.saveLanguages(ordered);
  }

  /**
   * Export a language's vocabulary as JSON and trigger download.
   */
  exportLanguage(languageCode: string): void {
    const lang = languageCode.trim().toLowerCase();
    if (!lang) return;
    this.persistence.getVocabularyFile(lang).subscribe((file) => {
      const blob = new Blob([JSON.stringify(file, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vocabulist-${lang}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  /**
   * Replace a language's vocabulary with backup data (from export). Validates shape.
   */
  replaceFromBackup(file: unknown): { ok: boolean; error?: string } {
    if (!file || typeof file !== 'object' || !('words' in file)) {
      return { ok: false, error: 'Invalid backup: missing words array.' };
    }
    const f = file as Record<string, unknown>;
    const words = f['words'];
    if (!Array.isArray(words)) {
      return { ok: false, error: 'Invalid backup: words must be an array.' };
    }
    const lang = typeof f['languageCode'] === 'string' ? f['languageCode'].trim().toLowerCase() : '';
    if (!lang) {
      return { ok: false, error: 'Invalid backup: missing languageCode.' };
    }
    const normalized: VocabWord[] = [];
    for (const w of words) {
      if (!w || typeof w !== 'object' || !('id' in w) || !('word' in w) || !('translation' in w)) continue;
      const r = w as Record<string, unknown>;
      const topicTags = Array.isArray(r['topicTags'])
        ? (r['topicTags'] as unknown[]).filter((t: unknown): t is string => typeof t === 'string')
        : [];
      const grammarTags = Array.isArray(r['grammarTags'])
        ? (r['grammarTags'] as unknown[]).filter((t: unknown): t is string => typeof t === 'string')
        : undefined;
      normalized.push({
        id: String(r['id']),
        word: String(r['word']),
        translation: String(r['translation']),
        topicTags,
        grammarTags: grammarTags?.length ? grammarTags : undefined,
        lastPracticed: typeof r['lastPracticed'] === 'string' ? r['lastPracticed'] : undefined,
        nextDue: typeof r['nextDue'] === 'string' ? r['nextDue'] : undefined,
        intervalDays: typeof r['intervalDays'] === 'number' ? r['intervalDays'] : undefined,
      });
    }
    this.persistence.saveWords(lang, normalized);
    const allLangs = this.persistence.languages();
    if (!allLangs.includes(lang)) {
      this.persistence.saveLanguages([...allLangs, lang]);
    }
    return { ok: true };
  }

  /**
   * Import from Duolingo JSON. Merges into existing words for the language (by word+translation).
   * Adds language to list if new. exportedAt is not persisted.
   */
  importFromDuolingo(exportData: DuolingoExport, languageCode: string): { imported: number; total: number } {
    const incoming = mapDuolingoToVocabWords(exportData);
    const existing = this.persistence.words();
    const lang = languageCode.trim().toLowerCase();
    if (!lang) return { imported: 0, total: incoming.length };

    const key = (w: VocabWord) => `${w.word}|${w.translation}`;
    const existingSet = new Set(existing.map(key));
    const toAdd: VocabWord[] = [];
    for (const w of incoming) {
      if (!existingSet.has(key(w))) {
        existingSet.add(key(w));
        toAdd.push(w);
      }
    }
    const newWords = [...existing, ...toAdd];
    this.persistence.saveWords(lang, newWords);

    const allLangs = this.persistence.languages();
    if (!allLangs.includes(lang)) {
      this.persistence.saveLanguages([...allLangs, lang]);
    }
    return { imported: toAdd.length, total: incoming.length };
  }

  /**
   * Import from Duolingo JSON and enrich new words with grammar tags from Free Dictionary API.
   * Only calls the API for words not already in the user's vocab for that language.
   * Emits progress so the UI can show a spinner.
   */
  importFromDuolingoAndEnrich(
    exportData: DuolingoExport,
    languageCode: string
  ): Observable<ImportEnrichProgress> {
    const lang = languageCode.trim().toLowerCase();
    const incoming = mapDuolingoToVocabWords(exportData);
    if (!lang) {
      return of({ stage: 'error', message: 'Invalid language code.' });
    }

    const progress$ = new Subject<ImportEnrichProgress>();
    this.persistence.getVocabularyFile(lang).subscribe({
      next: (file) => {
        const existing = file?.words ?? [];
        const key = (w: VocabWord) => `${w.word}|${w.translation}`;
        const existingSet = new Set(existing.map(key));
        const toAdd: VocabWord[] = [];
        for (const w of incoming) {
          if (!existingSet.has(key(w))) toAdd.push(w);
        }

        if (toAdd.length === 0) {
          const allLangs = this.persistence.languages();
          if (!allLangs.includes(lang)) this.persistence.saveLanguages([...allLangs, lang]);
          progress$.next({ stage: 'done', imported: 0, total: incoming.length });
          progress$.complete();
          return;
        }

        progress$.next({ stage: 'enriching', total: toAdd.length, done: 0 });
        let done = 0;
        const enriched: VocabWord[] = [];
        const processNext = (index: number) => {
          if (index >= toAdd.length) {
            const finalWords = [...existing, ...enriched];
            this.persistence.saveWords(lang, finalWords);
            const allLangs = this.persistence.languages();
            if (!allLangs.includes(lang)) this.persistence.saveLanguages([...allLangs, lang]);
            progress$.next({ stage: 'done', imported: enriched.length, total: incoming.length });
            progress$.complete();
            return;
          }
          const w = toAdd[index];
          this.dictionary.getGrammarTags(lang, w.word).pipe(delay(350)).subscribe({
            next: (result) => {
              if (result.found) {
                enriched.push(result.tags.length ? { ...w, grammarTags: result.tags } : w);
              }
              done++;
              progress$.next({ stage: 'enriching', total: toAdd.length, done });
              processNext(index + 1);
            },
            error: () => {
              done++;
              progress$.next({ stage: 'enriching', total: toAdd.length, done });
              processNext(index + 1);
            },
          });
        };
        processNext(0);
      },
      error: () => {
        progress$.next({ stage: 'error', message: 'Could not load existing vocabulary.' });
        progress$.complete();
      },
    });
    return progress$.asObservable();
  }

  addWord(word: string, translation: string, topicTags: string[] = []): VocabWord {
    const w: VocabWord = {
      id: generateId(),
      word: word.trim(),
      translation: translation.trim(),
      topicTags: topicTags.filter((t) => t.trim()),
    };
    const lang = this.persistence.currentLanguage();
    if (!lang) return w;
    const list = [...this.persistence.words(), w];
    this.persistence.saveWords(lang, list);
    return w;
  }

  updateWord(wordId: string, updates: Partial<Pick<VocabWord, 'word' | 'translation' | 'topicTags' | 'grammarTags'>>): void {
    const lang = this.persistence.currentLanguage();
    if (!lang) return;
    const list = this.persistence.words().map((w) =>
      w.id === wordId ? { ...w, ...updates } : w
    );
    this.persistence.saveWords(lang, list);
  }

  removeWord(wordId: string): void {
    const lang = this.persistence.currentLanguage();
    if (!lang) return;
    const list = this.persistence.words().filter((w) => w.id !== wordId);
    this.persistence.saveWords(lang, list);
  }

  /**
   * Words due for review (and optionally new). Optional tag filter. Sorted: due first, then new.
   */
  getDueWords(options: {
    tag?: string;
    limit?: number;
    includeNew?: boolean;
  } = {}): VocabWord[] {
    const { tag, limit = 50, includeNew = true } = options;
    const list = this.persistence.words();
    const today = todayKey();
    let out = list.filter((w) => {
      const due = !w.nextDue || w.nextDue <= today;
      const newWord = (w.intervalDays ?? 0) === 0;
      if (!due && !newWord) return false;
      if (includeNew && newWord) return true;
      if (due) return true;
      return false;
    });
    if (tag?.trim()) {
      const t = tag.trim().toLowerCase();
      out = out.filter((w) => w.topicTags.some((x) => x.toLowerCase() === t));
    }
    out.sort((a, b) => {
      const aDue = (a.nextDue ?? '') <= today ? 0 : 1;
      const bDue = (b.nextDue ?? '') <= today ? 0 : 1;
      if (aDue !== bDue) return aDue - bDue;
      return (a.nextDue ?? '').localeCompare(b.nextDue ?? '');
    });
    return limit > 0 ? out.slice(0, limit) : out;
  }

  /**
   * Record a review result and update SRS fields.
   */
  recordReview(wordId: string, correct: boolean): void {
    const lang = this.persistence.currentLanguage();
    if (!lang) return;
    const today = todayKey();
    const list = this.persistence.words().map((w) => {
      if (w.id !== wordId) return w;
      const idx = intervalDaysToIndex(w.intervalDays ?? 0);
      const nextIdx = nextIntervalIndex(idx, correct);
      const intervalDays = SRS_INTERVAL_DAYS[nextIdx];
      const nextDue = addDays(today, intervalDays);
      return {
        ...w,
        lastPracticed: today,
        nextDue,
        intervalDays,
      };
    });
    this.persistence.saveWords(lang, list);
  }
}
