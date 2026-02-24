/**
 * Single vocabulary word. Stored per user, per language.
 * SRS fields: lastPracticed, nextDue, intervalDays.
 */
export interface VocabWord {
  id: string;
  /** Word in the target language. */
  word: string;
  /** Translation(s), e.g. "until, till, 'til". */
  translation: string;
  /** User-defined topic tags. */
  topicTags: string[];
  /** Grammar info from dictionary (e.g. part of speech, gender): noun, verb, adjective, feminine, masculine, neuter. */
  grammarTags?: string[];
  /** Last practice date (ISO date string). Omitted if never practiced. */
  lastPracticed?: string;
  /** Next review due (ISO date string). Omitted if new. */
  nextDue?: string;
  /** Current SRS interval in days (0 = new). */
  intervalDays?: number;
}
