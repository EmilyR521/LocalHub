import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-vocabulist-grammar',
  standalone: true,
  templateUrl: './grammar.component.html',
})
export class VocabulistGrammarComponent {
  /** Which main section is expanded (verb | noun | articles | patterns). */
  readonly expandedSection = signal<string | null>('verb');

  toggleSection(id: string): void {
    this.expandedSection.update((current) => (current === id ? null : id));
  }

  isExpanded(id: string): boolean {
    return this.expandedSection() === id;
  }
}
