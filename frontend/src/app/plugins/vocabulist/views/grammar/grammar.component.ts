import { Component, signal, computed } from '@angular/core';

export type GrammarLang = 'greek' | 'german';

/** Hint text for each grammar term (click to show). */
export const GRAMMAR_HINTS: Record<string, string> = {
  // Greek
  'present-a':
    'Present tense (Ενεστώτας). Action happening now or habitually. Example: "I solve" / "I am solving".',
  'simple-past-a':
    'Simple past (Αόριστος). Action that happened once or momentarily in the past. Example: "I solved".',
  'simple-future-a':
    'Simple future (Στιγμιαίος Μέλλοντας). Action that will happen once in the future. Formed with θα + verb. Example: "I will solve".',
  'present-b':
    'Present tense. Action happening now or habitually. Example: "I love".',
  'simple-past-b':
    'Simple past (Αόριστος). Action that happened once in the past. Example: "I loved".',
  'simple-future-b':
    'Simple future. Action that will happen. Example: "I will love".',
  'case-nominative':
    'Nominative. Case for the subject of a sentence (who/what does the action). Example: "The dog" (in "The dog runs").',
  'case-genitive':
    'Genitive. Case showing possession, relation, or "of". Example: "the dog\'s" or "of the dog".',
  'case-accusative':
    'Accusative. Case for the direct object (who/what receives the action). Example: "the dog" (in "I see the dog").',
  'case-vocative':
    'Vocative. Case used when addressing someone or something. Example: "Friend!" (when calling out to a friend).',
  'nom-sg':
    'Nominative singular. Form for a single noun, pronoun or adjective acting as the subject of a sentence. Example: "The dog" (in "The dog runs").',
  'gen-sg':
    'Genitive singular. Form showing possession or "of" for one item. Example: "of the dog".',
  'acc-sg':
    'Accusative singular. Form for the direct object (one item). Example: "the dog" (in "I see the dog").',
  'nom-pl':
    'Nominative plural. Subject form for more than one. Example: "The dogs" (in "The dogs run").',
  'gen-pl':
    'Genitive plural. Possession or "of" for multiple items. Example: "of the dogs".',
  'acc-pl':
    'Accusative plural. Direct object form for multiple items. Example: "the dogs" (in "I see the dogs").',

  // German — cases (shared concepts, German labels)
  'de-nom':
    'Nominative. Subject of the sentence (who/what does the action). Example: "der Mann" (the man) in "Der Mann kommt".',
  'de-acc':
    'Accusative. Direct object (who/what receives the action). Example: "den Mann" in "Ich sehe den Mann".',
  'de-dat':
    'Dative. Indirect object, recipient, or with certain prepositions/verbs. Example: "dem Mann" in "Ich gebe dem Mann das Buch".',
  'de-gen':
    'Genitive. Possession or "of". Example: "des Mannes" (of the man).',

  // German — tenses & moods (from German for English Speakers)
  'de-prasens':
    'Präsens (Present). Like English simple present; also used for future. Example: Er tut es (He does it).',
  'de-prateritum':
    'Präteritum (Simple past/Preterite). Narrative past; less common in speech than Perfekt. Example: Er tat es (He did it).',
  'de-perfekt':
    'Perfekt (Perfect). Haben/sein + past participle. Used for most spoken past. Example: Er hat es getan (He has done it).',
  'de-plusquamperfekt':
    'Plusquamperfekt (Past perfect/Pluperfect). For an action already completed in the past. Example: Er hatte es getan (He had done it).',
  'de-futur1':
    'Futur I (Future). Werden + infinitive. Example: Er wird es tun (He will do it).',
  'de-futur2':
    'Futur II (Future perfect). Example: Er wird es getan haben (He will have done it).',
  'de-indikativ':
    'Indikativ (Indicative). For statements of fact: what actually happens, happened, or will happen.',
  'de-konjunktiv1':
    'Konjunktiv I. Used mainly in reported/indirect speech (e.g. news).',
  'de-konjunktiv2':
    'Konjunktiv II. Hypothetical/conditional, like English "would". Example: Er würde es tun (He would do it).',
  'de-imperativ':
    'Imperativ (Imperative). Commands. Example: Tu es! (Do it!).',
};

@Component({
  selector: 'app-vocabulist-grammar',
  standalone: true,
  templateUrl: './grammar.component.html',
})
export class VocabulistGrammarComponent {
  /** Selected grammar language. */
  readonly selectedLang = signal<GrammarLang>('greek');

  /** Which main section is expanded (verb | noun | articles | patterns, or verb | declension1 | … for German). */
  readonly expandedSection = signal<string | null>('verb');

  /** ID of the hint currently shown (click-to-toggle). */
  readonly currentHintId = signal<string | null>(null);

  /** Position for the hint panel (fixed, just above the clicked element). */
  readonly hintPosition = signal<{ top: number; left: number } | null>(null);

  readonly currentHintText = computed(() => {
    const id = this.currentHintId();
    return id ? (GRAMMAR_HINTS[id] ?? '') : '';
  });

  private static readonly HINT_PANEL_WIDTH = 360;
  private static readonly GAP_PX = 8;

  toggleSection(id: string): void {
    this.expandedSection.update((current) => (current === id ? null : id));
  }

  isExpanded(id: string): boolean {
    return this.expandedSection() === id;
  }

  toggleHint(hintId: string, event?: MouseEvent): void {
    const target = event?.target instanceof HTMLElement ? event.target : null;
    if (this.currentHintId() === hintId) {
      this.currentHintId.set(null);
      this.hintPosition.set(null);
      return;
    }
    if (target) {
      const rect = target.getBoundingClientRect();
      const left = Math.max(
        VocabulistGrammarComponent.GAP_PX,
        Math.min(rect.left, window.innerWidth - VocabulistGrammarComponent.HINT_PANEL_WIDTH - VocabulistGrammarComponent.GAP_PX)
      );
      this.hintPosition.set({
        top: rect.top - VocabulistGrammarComponent.GAP_PX,
        left,
      });
    } else {
      this.hintPosition.set(null);
    }
    this.currentHintId.set(hintId);
  }

  closeHint(): void {
    this.currentHintId.set(null);
    this.hintPosition.set(null);
  }

  isHintActive(hintId: string): boolean {
    return this.currentHintId() === hintId;
  }

  setGrammarLang(lang: GrammarLang): void {
    this.selectedLang.set(lang);
    this.closeHint();
    this.expandedSection.set('verb');
  }
}
