import { Injectable, signal, inject, effect, computed } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { PluginStoreService } from '../../../core/services/plugin-store.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import type { VocabWord } from '../models/word.model';
import type { VocabularyFile } from '../models/vocabulary-file.model';
import {
  VOCABULIST_PLUGIN_ID,
  LANGUAGES_KEY,
  DEFAULT_LANGUAGE_KEY,
  vocabKey,
} from './vocabulist-store.constants';
import { normalizeVocabWord } from './vocab-backup.helper';

/**
 * Loads and persists vocabulist data per user.
 * Holds languages list and words for the current language only.
 */
@Injectable({ providedIn: 'root' })
export class VocabulistPersistenceService {
  private store = inject(PluginStoreService);
  private userProfile = inject(UserProfileService);

  private languagesSignal = signal<string[]>([]);
  private defaultLanguageCode = signal<string | null>(null);
  private currentLanguageCode = signal<string | null>(null);
  private wordsSignal = signal<VocabWord[]>([]);

  private loaded = false;
  private loadedUserId: string | undefined;
  private loadRequested = signal(false);

  readonly languages = this.languagesSignal.asReadonly();
  readonly defaultLanguage = this.defaultLanguageCode.asReadonly();
  readonly currentLanguage = this.currentLanguageCode.asReadonly();
  readonly words = this.wordsSignal.asReadonly();

  private userId = computed(() => this.userProfile.profile().id);

  constructor() {
    effect(() => {
      const id = this.userProfile.profile().id;
      if (!id) {
        this.languagesSignal.set([]);
        this.defaultLanguageCode.set(null);
        this.currentLanguageCode.set(null);
        this.wordsSignal.set([]);
        this.loaded = false;
        this.loadedUserId = undefined;
        return;
      }
      if (this.loadedUserId !== id) {
        this.loadedUserId = id;
        this.languagesSignal.set([]);
        this.defaultLanguageCode.set(null);
        this.currentLanguageCode.set(null);
        this.wordsSignal.set([]);
        this.loaded = false;
      }
      if (this.loadRequested() && !this.loaded) {
        this.loaded = true;
        this.fetchLanguages(id);
        this.fetchDefaultLanguage(id);
      }
    });
  }

  load(): void {
    this.userProfile.load();
    this.loadRequested.set(true);
  }

  setCurrentLanguage(code: string | null): void {
    this.currentLanguageCode.set(code);
    const id = this.userId();
    if (id && code) {
      this.store
        .get<VocabularyFile>(VOCABULIST_PLUGIN_ID, vocabKey(code), id)
        .subscribe({
          next: (data) => {
            const raw = data?.words;
            const words = Array.isArray(raw)
              ? raw.map((w) => normalizeVocabWord(w)).filter((w): w is VocabWord => w != null)
              : [];
            this.wordsSignal.set(words);
          },
          error: () => this.wordsSignal.set([]),
        });
    } else {
      this.wordsSignal.set([]);
    }
  }

  saveWords(languageCode: string, words: VocabWord[]): void {
    const id = this.userId();
    if (!id) return;
    if (this.currentLanguageCode() === languageCode) {
      this.wordsSignal.set(words);
    }
    this.store
      .put<VocabularyFile>(
        VOCABULIST_PLUGIN_ID,
        vocabKey(languageCode),
        { languageCode, words },
        id
      )
      .subscribe({ error: () => {} });
  }

  /** Fetch vocabulary file for a language without changing current language. Missing file is treated as empty. Words are normalized to current structure. */
  getVocabularyFile(languageCode: string): Observable<VocabularyFile> {
    const id = this.userId();
    if (!id || !languageCode) {
      return of({ languageCode: languageCode || '', words: [] });
    }
    return this.store
      .get<VocabularyFile>(VOCABULIST_PLUGIN_ID, vocabKey(languageCode), id)
      .pipe(
        map((data) => {
          const raw = data?.words;
          const words = Array.isArray(raw)
            ? raw.map((w) => normalizeVocabWord(w)).filter((w): w is VocabWord => w != null)
            : [];
          return { languageCode, words };
        }),
        catchError(() => of({ languageCode, words: [] }))
      );
  }

  saveLanguages(langs: string[]): void {
    const id = this.userId();
    if (!id) return;
    this.languagesSignal.set(langs);
    this.store
      .put<string[]>(VOCABULIST_PLUGIN_ID, LANGUAGES_KEY, langs, id)
      .subscribe({ error: () => {} });
  }

  setDefaultLanguage(code: string | null): void {
    const id = this.userId();
    if (!id) return;
    const value = code?.trim().toLowerCase() || null;
    this.defaultLanguageCode.set(value);
    this.store
      .put<string | null>(VOCABULIST_PLUGIN_ID, DEFAULT_LANGUAGE_KEY, value, id)
      .subscribe({ error: () => {} });
  }

  private fetchDefaultLanguage(userId: string): void {
    this.store
      .get<string | null>(VOCABULIST_PLUGIN_ID, DEFAULT_LANGUAGE_KEY, userId)
      .subscribe({
        next: (code) =>
          this.defaultLanguageCode.set(
            typeof code === 'string' && code.trim() ? code.trim().toLowerCase() : null
          ),
        error: () => this.defaultLanguageCode.set(null),
      });
  }

  private fetchLanguages(userId: string): void {
    this.store
      .get<string[]>(VOCABULIST_PLUGIN_ID, LANGUAGES_KEY, userId)
      .subscribe({
        next: (list) =>
          this.languagesSignal.set(Array.isArray(list) ? list : []),
        error: () => this.languagesSignal.set([]),
      });
  }
}
