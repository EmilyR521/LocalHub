/**
 * Store keys and ID generation for the vocabulist plugin.
 */
export const VOCABULIST_PLUGIN_ID = 'vocabulist';
export const LANGUAGES_KEY = 'languages';
export const DEFAULT_LANGUAGE_KEY = 'defaultLanguage';

export function vocabKey(languageCode: string): string {
  return `vocab-${languageCode}`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
