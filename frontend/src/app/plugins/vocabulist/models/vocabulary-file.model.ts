import type { VocabWord } from './word.model';

/**
 * One vocabulary file per user, per language.
 */
export interface VocabularyFile {
  languageCode: string;
  words: VocabWord[];
}
