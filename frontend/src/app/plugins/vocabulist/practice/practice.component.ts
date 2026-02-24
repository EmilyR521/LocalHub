import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VocabulistService } from '../services/vocabulist.service';
import { getLanguageLabel } from '../services/language-display.helper';
import { getWordWithArticle } from '../services/word-display.helper';
import type { VocabWord } from '../models/word.model';

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
  readonly sessionWords = signal<VocabWord[]>([]);
  readonly index = signal(0);
  readonly showBack = signal(false);
  readonly reviewed = signal(0);
  readonly correctCount = signal(0);

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

  /** Word with optional language-specific article (noun + gender) for display. */
  wordDisplay(w: VocabWord, languageCode: string): string {
    return getWordWithArticle(w, languageCode);
  }

  readonly isDone = computed(() => {
    const list = this.sessionWords();
    const i = this.index();
    return list.length > 0 && i >= list.length;
  });

  constructor() {
    effect(() => {
      const lang = this.lang();
      if (lang) this.vocab.setCurrentLanguage(lang);
    });
    effect(() => {
      const lang = this.lang();
      const tag = this.tag();
      const words = this.vocab.words();
      const idx = this.index();
      const reviewed = this.reviewed();
      if (!lang) return;
      const due = this.vocab.getDueWords({
        tag: tag || undefined,
        limit: 30,
        includeNew: true,
      });
      if (idx === 0 && reviewed === 0) {
        this.sessionWords.set(due);
        this.showBack.set(false);
      }
    });
  }

  ngOnInit(): void {
    this.vocab.load();
    this.route.queryParamMap.subscribe((params) => {
      this.lang.set(params.get('lang'));
      this.tag.set(params.get('tag') ?? '');
    });
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
}
