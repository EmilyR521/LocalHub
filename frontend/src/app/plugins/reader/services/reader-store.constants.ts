/**
 * Store keys and ID generation for the reader plugin.
 * Single place for plugin/store identifiers.
 */
export const READER_PLUGIN_ID = 'reader';
export const BOOKS_KEY = 'books';
export const COLLECTIONS_KEY = 'collections';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
