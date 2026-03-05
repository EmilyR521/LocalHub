import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VocabulistService } from '../../services/vocabulist.service';
import { getLanguageLabel } from '../../services/language-display.helper';
import { getWordWithArticle } from '../../services/word-display.helper';
import type { VocabWord } from '../../models/word.model';

/** Question direction: show word (target lang) and answer with translation, or the reverse. */
export type PracticeDirection = 'word_to_translation' | 'translation_to_word';

@Component({
  selector: 'app-vocabulist-practice',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './practice.component.html',
})
export class VocabulistPracticeComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private vocab = inject(VocabulistService);

  readonly lang = signal<string | null>(null);
  readonly tag = signal<string>('');
  readonly direction = signal<PracticeDirection>('word_to_translation');
  readonly sessionStarted = signal(false);
  readonly sessionWords = signal<VocabWord[]>([]);
  readonly index = signal(0);
  readonly showBack = signal(false);
  readonly reviewed = signal(0);
  readonly correctCount = signal(0);

  readonly languages = this.vocab.languages;

  /** Topic tags from the current language's words (for optional filter in setup). */
  readonly allTagsForPractice = computed(() => {
    const set = new Set<string>();
    for (const w of this.vocab.words()) {
      for (const t of w.topicTags) if (t.trim()) set.add(t.trim());
    }
    return [...set].sort();
  });

  readonly currentWord = computed(() => {
    const list = this.sessionWords();
    const i = this.index();
    return list[i] ?? null;
  });

  readonly progressLabel = computed(() => {
    const list = this.sessionWords();
    const i = this.index();
    const r = this.reviewed();
    if (list.length === 0) return 'No words to practice';
    return `${i + 1} / ${list.length} · ${r} reviewed`;
  });

  /** Prompt text for the current card (question side). */
  readonly promptText = computed(() => {
    const w = this.currentWord();
    const l = this.lang();
    const dir = this.direction();
    if (!w || !l) return '';
    return dir === 'word_to_translation'
      ? getWordWithArticle(w, l)
      : w.translation;
  });

  /** Answer text for the current card (revealed side). */
  readonly answerText = computed(() => {
    const w = this.currentWord();
    const l = this.lang();
    const dir = this.direction();
    if (!w || !l) return '';
    return dir === 'word_to_translation'
      ? w.translation
      : getWordWithArticle(w, l);
  });

  /** Word with optional language-specific article for display. */
  wordDisplay(w: VocabWord, languageCode: string): string {
    return getWordWithArticle(w, languageCode);
  }

  readonly isDone = computed(() => {
    const list = this.sessionWords();
    const i = this.index();
    return list.length > 0 && i >= list.length;
  });

  /** True when we should show the setup form (language + direction + start). */
  readonly showSetup = computed(() => {
    if (this.sessionStarted()) {
      const list = this.sessionWords();
      return list.length === 0 && this.reviewed() === 0;
    }
    return true;
  });

  constructor() {
    effect(() => {
      const lang = this.lang();
      if (lang) this.vocab.setCurrentLanguage(lang);
    });
    effect(() => {
      const started = this.sessionStarted();
      const lang = this.lang();
      const tag = this.tag();
      const idx = this.index();
      const reviewed = this.reviewed();
      if (!started || !lang) return;
      if (idx !== 0 || reviewed !== 0) return;
      const due = this.vocab.getDueWords({
        tag: tag || undefined,
        limit: 30,
        includeNew: true,
      });
      this.sessionWords.set(due);
      this.showBack.set(false);
    });
  }

  ngOnInit(): void {
    this.vocab.load();
    this.route.queryParamMap.subscribe((params) => {
      this.lang.set(params.get('lang'));
      this.tag.set(params.get('tag') ?? '');
      const dir = params.get('dir');
      if (dir === 'translation_to_word' || dir === 'word_to_translation') {
        this.direction.set(dir);
      }
    });
  }

  setLang(code: string): void {
    this.lang.set(code);
    this.updateQueryParams();
  }

  setDirection(dir: PracticeDirection): void {
    this.direction.set(dir);
    this.updateQueryParams();
  }

  setTag(tag: string): void {
    this.tag.set(tag);
    this.updateQueryParams();
  }

  private updateQueryParams(): void {
    const l = this.lang();
    const t = this.tag();
    const d = this.direction();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...(l ? { lang: l } : {}),
        ...(t ? { tag: t } : {}),
        ...(d !== 'word_to_translation' ? { dir: d } : {}),
      },
      queryParamsHandling: '',
      replaceUrl: true,
    });
  }

  startSession(): void {
    const l = this.lang();
    if (!l) return;
    this.vocab.setCurrentLanguage(l);
    const due = this.vocab.getDueWords({
      tag: this.tag() || undefined,
      limit: 30,
      includeNew: true,
    });
    this.sessionWords.set(due);
    this.index.set(0);
    this.reviewed.set(0);
    this.correctCount.set(0);
    this.sessionStarted.set(true);
  }

  practiceAgain(): void {
    this.sessionStarted.set(false);
    this.sessionWords.set([]);
    this.index.set(0);
    this.reviewed.set(0);
    this.correctCount.set(0);
  }

  record(correct: boolean): void {
    const w = this.currentWord();
    if (!w) return;
    this.vocab.recordReview(w.id, correct);
    this.reviewed.update((n) => n + 1);
    if (correct) this.correctCount.update((n) => n + 1);
    this.showBack.set(false);
    this.index.update((i) => i + 1);
  }

  toggleBack(): void {
    this.showBack.update((v) => !v);
  }

  backToList(): void {
    const l = this.lang();
    this.router.navigate(['/plugins/vocabulist'], {
      queryParams: l ? { lang: l } : {},
    });
  }

  /** Full name + flag for display, e.g. "🇩🇪 German". */
  languageLabel(code: string | null): string {
    return code ? getLanguageLabel(code) : 'vocabulary';
  }

  /** Human-readable direction label for the selected language. */
  directionLabel(): string {
    const l = this.lang();
    const name = l ? getLanguageLabel(l) : 'target';
    return this.direction() === 'word_to_translation'
      ? `${name} → Translation`
      : `Translation → ${name}`;
  }
}
