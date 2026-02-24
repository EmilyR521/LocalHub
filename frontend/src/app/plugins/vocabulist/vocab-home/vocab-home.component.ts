import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VocabulistService } from '../services/vocabulist.service';
import { getLanguageLabel } from '../services/language-display.helper';
import { getWordWithArticle } from '../services/word-display.helper';
import type { VocabWord } from '../models/word.model';

@Component({
  selector: 'app-vocab-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './vocab-home.component.html',
})
export class VocabHomeComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private vocab = inject(VocabulistService);

  readonly languages = this.vocab.languages;
  readonly defaultLanguage = this.vocab.defaultLanguage;
  readonly currentLanguage = this.vocab.currentLanguage;
  readonly words = this.vocab.words;
  readonly dueWords = this.vocab.dueWords;

  /** Selected topic tags for filter (multiselect). Empty = show all. */
  readonly selectedTags = signal<Set<string>>(new Set());
  /** Selected grammar tags for filter (multiselect). Empty = show all. */
  readonly selectedGrammarTags = signal<Set<string>>(new Set());
  readonly searchQuery = signal('');
  readonly filtersOpen = signal(false);

  readonly filteredWords = computed(() => {
    let list = this.vocab.words();
    const tags = this.selectedTags();
    const grammarTags = this.selectedGrammarTags();
    const q = this.searchQuery().trim().toLowerCase();
    if (tags.size > 0) {
      const tagLower = new Set([...tags].map((t) => t.toLowerCase()));
      list = list.filter((w) =>
        w.topicTags.some((t) => tagLower.has(t.toLowerCase()))
      );
    }
    if (grammarTags.size > 0) {
      const gLower = new Set([...grammarTags].map((g) => g.toLowerCase()));
      list = list.filter((w) =>
        Array.isArray(w.grammarTags) &&
        w.grammarTags.some((g) => gLower.has(g.toLowerCase()))
      );
    }
    if (q) {
      list = list.filter(
        (w) =>
          w.word.toLowerCase().includes(q) ||
          w.translation.toLowerCase().includes(q)
      );
    }
    return list;
  });

  readonly allTags = computed(() => {
    const set = new Set<string>();
    for (const w of this.vocab.words()) {
      for (const t of w.topicTags) if (t.trim()) set.add(t.trim());
    }
    return [...set].sort();
  });

  readonly allGrammarTags = computed(() => {
    const set = new Set<string>();
    for (const w of this.vocab.words()) {
      const gt = w.grammarTags;
      if (Array.isArray(gt)) for (const g of gt) if (g.trim()) set.add(g.trim());
    }
    return [...set].sort();
  });

  /** Number of active filters (tags + grammar tags + search non-empty). */
  readonly activeFilterCount = computed(() => {
    let n = this.selectedTags().size + this.selectedGrammarTags().size;
    if (this.searchQuery().trim()) n += 1;
    return n;
  });

  toggleFilters(): void {
    this.filtersOpen.update((v) => !v);
  }

  constructor() {
    effect(() => {
      const params = this.route.snapshot.queryParamMap;
      const langFromRoute = params.get('lang');
      const langs = this.vocab.languages();
      const defaultLang = this.vocab.defaultLanguage();

      if (langFromRoute) {
        this.vocab.setCurrentLanguage(langFromRoute);
        return;
      }
      const effective =
        (defaultLang && langs.includes(defaultLang) ? defaultLang : null) ||
        langs[0] ||
        null;
      if (effective) {
        this.vocab.setCurrentLanguage(effective);
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { lang: effective },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });
  }

  ngOnInit(): void {
    this.vocab.load();
    this.route.queryParamMap.subscribe((params) => {
      const lang = params.get('lang');
      if (lang) {
        this.vocab.setCurrentLanguage(lang);
        return;
      }
      const langs = this.vocab.languages();
      const defaultLang = this.vocab.defaultLanguage();
      const effective =
        (defaultLang && langs.includes(defaultLang) ? defaultLang : null) ||
        langs[0] ||
        null;
      if (effective) {
        this.vocab.setCurrentLanguage(effective);
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { lang: effective },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });
  }

  setLanguage(code: string): void {
    this.vocab.setCurrentLanguage(code);
  }

  toggleTag(tag: string): void {
    this.selectedTags.update((set) => {
      const next = new Set(set);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  isTagSelected(tag: string): boolean {
    return this.selectedTags().has(tag);
  }

  toggleGrammarTag(grammarTag: string): void {
    this.selectedGrammarTags.update((set) => {
      const next = new Set(set);
      if (next.has(grammarTag)) next.delete(grammarTag);
      else next.add(grammarTag);
      return next;
    });
  }

  isGrammarTagSelected(grammarTag: string): boolean {
    return this.selectedGrammarTags().has(grammarTag);
  }

  /** Full name + flag for display, e.g. "🇩🇪 German". */
  languageLabel(code: string): string {
    return getLanguageLabel(code);
  }

  trackByWordId(_index: number, w: VocabWord): string {
    return w.id;
  }

  /** Word with optional language-specific article (noun + gender). */
  wordDisplay(w: VocabWord, languageCode: string): string {
    return getWordWithArticle(w, languageCode);
  }
}
