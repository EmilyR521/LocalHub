import type { VocabWord } from '../models/word.model';

/**
 * Definite articles for nouns by gender and number (nominative).
 * Used when displaying a word that has grammarTags: noun + gender (and optionally singular/plural).
 */
const GREEK_ARTICLES: Record<string, string> = {
  masculine_singular: 'ο',
  masculine_plural: 'οι',
  feminine_singular: 'η',
  feminine_plural: 'οι',
  neuter_singular: 'το',
  neuter_plural: 'τα',
};

const GERMAN_ARTICLES: Record<string, string> = {
  masculine_singular: 'der',
  masculine_plural: 'die',
  feminine_singular: 'die',
  feminine_plural: 'die',
  neuter_singular: 'das',
  neuter_plural: 'die',
};

function getArticleForTags(
  tagSet: Set<string>,
  articles: Record<string, string>
): string | null {
  const isPlural = tagSet.has('plural');
  if (tagSet.has('neuter')) {
    const key = isPlural ? 'neuter_plural' : 'neuter_singular';
    return articles[key] ?? null;
  }
  if (tagSet.has('feminine')) {
    const key = isPlural ? 'feminine_plural' : 'feminine_singular';
    return articles[key] ?? null;
  }
  if (tagSet.has('masculine')) {
    const key = isPlural ? 'masculine_plural' : 'masculine_singular';
    return articles[key] ?? null;
  }
  return null;
}

/**
 * Returns the word with a preceding definite article when the word is a noun with a gender
 * and the language has article support (Greek, German). Otherwise returns the word as-is.
 */
export function getWordWithArticle(word: VocabWord, languageCode: string): string {
  const lang = languageCode?.trim().toLowerCase() || '';
  const tags = word.grammarTags;
  if (!Array.isArray(tags) || tags.length === 0) return word.word;

  const tagSet = new Set(tags.map((t) => t.toLowerCase().trim()));
  if (!tagSet.has('noun')) return word.word;

  let article: string | null = null;
  if (lang === 'el') {
    article = getArticleForTags(tagSet, GREEK_ARTICLES);
  } else if (lang === 'de') {
    article = getArticleForTags(tagSet, GERMAN_ARTICLES);
  }
  if (article) return `${article} ${word.word}`;
  return word.word;
}
