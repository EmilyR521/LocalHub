import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VocabulistService } from '../services/vocabulist.service';
import { getLanguageLabel } from '../services/language-display.helper';
import { getWordWithArticle } from '../services/word-display.helper';
import type { VocabWord } from '../models/word.model';

@Component({
  selector: 'app-word-detail',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './word-detail.component.html',
})
export class WordDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private vocab = inject(VocabulistService);

  readonly wordId = signal<string | null>(null);
  readonly lang = signal<string | null>(null);
  readonly word = computed(() => {
    const id = this.wordId();
    if (!id) return null;
    return this.vocab.words().find((w) => w.id === id) ?? null;
  });

  readonly editWord = signal('');
  readonly editTranslation = signal('');
  readonly editTags = signal<string[]>([]);
  readonly newTag = signal('');

  constructor() {
    effect(() => {
      const l = this.lang();
      if (l) this.vocab.setCurrentLanguage(l);
    });
    effect(() => {
      const w = this.word();
      if (w) {
        this.editWord.set(w.word);
        this.editTranslation.set(w.translation);
        this.editTags.set([...w.topicTags]);
      }
    });
  }

  ngOnInit(): void {
    this.vocab.load();
    this.route.paramMap.subscribe((params) => {
      this.wordId.set(params.get('id'));
    });
    this.route.queryParamMap.subscribe((params) => {
      this.lang.set(params.get('lang'));
    });
  }

  save(): void {
    const w = this.word();
    if (!w) return;
    this.vocab.updateWord(w.id, {
      word: this.editWord().trim(),
      translation: this.editTranslation().trim(),
      topicTags: this.editTags().filter((t) => t.trim()),
    });
    this.back();
  }

  removeTag(tag: string): void {
    this.editTags.update((tags) => tags.filter((t) => t !== tag));
  }

  addTag(): void {
    const t = this.newTag().trim();
    if (!t) return;
    if (!this.editTags().includes(t)) {
      this.editTags.update((tags) => [...tags, t]);
    }
    this.newTag.set('');
  }

  deleteWord(): void {
    const w = this.word();
    if (!w || !confirm(`Delete "${w.word}"?`)) return;
    this.vocab.removeWord(w.id);
    this.back();
  }

  back(): void {
    const l = this.lang();
    this.router.navigate(['/plugins/vocabulist'], {
      queryParams: l ? { lang: l } : {},
    });
  }

  /** Full name + flag for display, e.g. "🇩🇪 German". */
  languageLabel(code: string | null): string {
    return code ? getLanguageLabel(code) : 'vocabulary';
  }

  /** Word with optional language-specific article (noun + gender) for display. */
  wordDisplay(w: VocabWord, languageCode: string): string {
    return getWordWithArticle(w, languageCode);
  }
}
