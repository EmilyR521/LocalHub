import { Component, inject, signal } from '@angular/core';
import { VocabulistService } from '../../services/vocabulist.service';
import { getLanguageLabel } from '../../services/language-display.helper';

@Component({
  selector: 'app-vocabulist-settings',
  standalone: true,
  templateUrl: './vocabulist-settings.component.html',
})
export class VocabulistSettingsComponent {
  private vocab = inject(VocabulistService);

  readonly languages = this.vocab.languages;
  readonly defaultLanguage = this.vocab.defaultLanguage;
  readonly currentLanguage = this.vocab.currentLanguage;

  /** Dropdown value: existing lang code or '__new__'. */
  readonly importDropdownValue = signal('');
  /** When "New language" is selected, this is the typed code. */
  readonly newLanguageCode = signal('');
  readonly importStatus = signal<'idle' | 'importing' | 'enriching' | 'done' | 'error'>('idle');
  readonly importMessage = signal('');
  /** When enriching: { total, done }. */
  readonly importEnrichProgress = signal<{ total: number; done: number } | null>(null);
  readonly exportLanguageCode = signal('');
  readonly restoreStatus = signal<'idle' | 'restoring' | 'done' | 'error'>('idle');
  readonly restoreMessage = signal('');

  /** Effective language code to import into. */
  getImportTargetLang(): string {
    const dropdown = this.importDropdownValue();
    if (dropdown === '__new__' || (this.languages().length === 0 && !dropdown)) {
      return this.newLanguageCode().trim();
    }
    return (dropdown || this.currentLanguage() || '').trim();
  }

  setImportDropdown(value: string): void {
    this.importDropdownValue.set(value ?? '');
  }

  setNewLanguageCode(value: string): void {
    this.newLanguageCode.set(value ?? '');
  }

  /** Full name + flag for display, e.g. "🇩🇪 German". */
  languageLabel(code: string): string {
    return getLanguageLabel(code);
  }

  setDefaultLanguage(code: string | null): void {
    this.vocab.setDefaultLanguage(code || null);
  }

  moveLanguage(index: number, direction: 1 | -1): void {
    const list = [...this.vocab.languages()];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= list.length) return;
    [list[index], list[newIndex]] = [list[newIndex], list[index]];
    this.vocab.reorderLanguages(list);
  }

  setExportLanguage(code: string): void {
    this.exportLanguageCode.set(code ?? '');
  }

  exportVocabulary(): void {
    const lang = this.exportLanguageCode().trim().toLowerCase();
    if (!lang) {
      return;
    }
    this.vocab.exportLanguage(lang);
  }

  onRestoreFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.restoreStatus.set('restoring');
    this.restoreMessage.set('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        const result = this.vocab.replaceFromBackup(json);
        if (result.ok) {
          this.restoreMessage.set('Backup restored. Vocabulary for that language has been replaced.');
          this.restoreStatus.set('done');
        } else {
          this.restoreMessage.set(result.error ?? 'Restore failed.');
          this.restoreStatus.set('error');
        }
      } catch {
        this.restoreMessage.set('Invalid JSON backup file.');
        this.restoreStatus.set('error');
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const lang = this.getImportTargetLang().toLowerCase();
    if (!file) return;
    if (!lang) {
      this.importMessage.set('Select or enter a language code first (e.g. de, el).');
      this.importStatus.set('error');
      input.value = '';
      return;
    }
    this.importStatus.set('importing');
    this.importMessage.set('');
    this.importEnrichProgress.set(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        this.vocab.importFromDuolingoAndEnrich(json, lang).subscribe({
          next: (progress) => {
            if (progress.stage === 'enriching') {
              this.importStatus.set('enriching');
              this.importEnrichProgress.set({ total: progress.total, done: progress.done });
            } else if (progress.stage === 'done') {
              this.vocab.setCurrentLanguage(lang);
              this.importMessage.set(
                progress.imported > 0
                  ? `Imported ${progress.imported} new word(s) (${progress.total} in file). Grammar tags fetched from dictionary.`
                  : `No new words to add (${progress.total} in file).`
              );
              this.importStatus.set('done');
              this.importEnrichProgress.set(null);
            } else if (progress.stage === 'error') {
              this.importMessage.set(progress.message);
              this.importStatus.set('error');
              this.importEnrichProgress.set(null);
            }
          },
          error: () => {
            this.importMessage.set('Import failed.');
            this.importStatus.set('error');
            this.importEnrichProgress.set(null);
          },
          complete: () => {
            input.value = '';
          },
        });
      } catch {
        this.importMessage.set('Invalid JSON or Duolingo format.');
        this.importStatus.set('error');
        input.value = '';
      }
    };
    reader.readAsText(file);
  }
}
