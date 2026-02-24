import type { VocabWord } from '../models/word.model';
import type { VocabularyFile } from '../models/vocabulary-file.model';

/**
 * Normalize raw JSON to a VocabWord. Returns null if the object is missing required fields.
 * Handles current structure: id, word, translation, topicTags, grammarTags, lastPracticed, nextDue, intervalDays.
 */
export function normalizeVocabWord(raw: unknown): VocabWord | null {
  if (!raw || typeof raw !== 'object' || !('id' in raw) || !('word' in raw) || !('translation' in raw)) {
    return null;
  }
  const r = raw as Record<string, unknown>;
  const topicTags = Array.isArray(r['topicTags'])
    ? (r['topicTags'] as unknown[]).filter((t: unknown): t is string => typeof t === 'string')
    : [];
  const grammarTags = Array.isArray(r['grammarTags'])
    ? (r['grammarTags'] as unknown[]).filter((t: unknown): t is string => typeof t === 'string')
    : undefined;
  const lastPracticed = typeof r['lastPracticed'] === 'string' ? r['lastPracticed'] : undefined;
  const nextDue = typeof r['nextDue'] === 'string' ? r['nextDue'] : undefined;
  const intervalDays = typeof r['intervalDays'] === 'number' && Number.isFinite(r['intervalDays']) ? r['intervalDays'] : undefined;

  return {
    id: String(r['id']),
    word: String(r['word']),
    translation: String(r['translation']),
    topicTags,
    grammarTags: grammarTags?.length ? grammarTags : undefined,
    lastPracticed,
    nextDue,
    intervalDays,
  };
}

/** Serializable word shape for export (current backup format): topicTags and grammarTags always arrays. */
export function wordToExportShape(w: VocabWord): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: w.id,
    word: w.word,
    translation: w.translation,
    topicTags: w.topicTags ?? [],
    grammarTags: w.grammarTags ?? [],
  };
  if (w.lastPracticed) out['lastPracticed'] = w.lastPracticed;
  if (w.nextDue) out['nextDue'] = w.nextDue;
  if (w.intervalDays !== undefined) out['intervalDays'] = w.intervalDays;
  return out;
}

/**
 * Build a VocabularyFile for export: normalized words in current backup format (topicTags/grammarTags always arrays).
 */
export function buildVocabularyFileForExport(languageCode: string, rawWords: unknown[]): {
  languageCode: string;
  words: Record<string, unknown>[];
} {
  const words: Record<string, unknown>[] = [];
  for (const raw of rawWords) {
    const w = normalizeVocabWord(raw);
    if (w) words.push(wordToExportShape(w));
  }
  return { languageCode, words };
}

/**
 * Parse and validate backup file (from export or user upload). Returns normalized file or error.
 */
export function parseBackupFile(file: unknown): { ok: true; file: VocabularyFile } | { ok: false; error: string } {
  if (!file || typeof file !== 'object' || !('words' in file)) {
    return { ok: false, error: 'Invalid backup: missing words array.' };
  }
  const f = file as Record<string, unknown>;
  const wordsRaw = f['words'];
  if (!Array.isArray(wordsRaw)) {
    return { ok: false, error: 'Invalid backup: words must be an array.' };
  }
  const lang = typeof f['languageCode'] === 'string' ? f['languageCode'].trim().toLowerCase() : '';
  if (!lang) {
    return { ok: false, error: 'Invalid backup: missing languageCode.' };
  }
  const words: VocabWord[] = [];
  for (const raw of wordsRaw) {
    const w = normalizeVocabWord(raw);
    if (w) words.push(w);
  }
  return { ok: true, file: { languageCode: lang, words } };
}
