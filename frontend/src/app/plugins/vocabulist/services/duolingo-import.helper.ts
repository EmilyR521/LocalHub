import type { VocabWord } from '../models/word.model';
import { generateId } from './vocabulist-store.constants';

/** Duolingo export JSON shape. exportedAt is not persisted. */
export interface DuolingoExport {
  exportedAt?: string;
  words?: Array<{
    word?: string;
    translation?: string;
    lastPracticed?: string;
    skill?: string;
    strength?: string;
  }>;
}

/**
 * Map Duolingo export to VocabWord[]. Ignores exportedAt.
 * skill becomes a single topic tag if non-empty.
 */
export function mapDuolingoToVocabWords(exportData: DuolingoExport): VocabWord[] {
  const raw = exportData?.words;
  if (!Array.isArray(raw)) return [];
  const today = new Date().toISOString().slice(0, 10);
  return raw
    .filter((w) => w && (w.word != null || w.translation != null))
    .map((w) => {
      const word = String(w.word ?? '').trim();
      const translation = String(w.translation ?? '').trim();
      const topicTags: string[] = [];
      if (typeof w.skill === 'string' && w.skill.trim()) {
        topicTags.push(w.skill.trim());
      }
      return {
        id: generateId(),
        word: word || '?',
        translation: translation || '?',
        topicTags,
        // New import: no SRS fields (treated as new)
      } satisfies VocabWord;
    });
}
