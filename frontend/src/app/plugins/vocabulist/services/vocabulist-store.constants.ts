/**
 * Store keys and ID generation for the vocabulist plugin.
 */
export const VOCABULIST_PLUGIN_ID = 'vocabulist';
export const LANGUAGES_KEY = 'languages';
export const DEFAULT_LANGUAGE_KEY = 'defaultLanguage';

export function vocabKey(languageCode: string): string {
  return `vocab-${languageCode}`;
}
