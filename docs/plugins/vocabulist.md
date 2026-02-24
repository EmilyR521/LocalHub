# Vocabulist plugin

## Purpose

Import vocabulary (e.g. from Duolingo export JSON), attach **topic tags**, and practice with **spaced repetition**. Data is stored **per user, per language**: one vocabulary set per language (e.g. German, Greek).

## Data structure

### Store layout

- **Plugin ID**: `vocabulist`
- **Keys**:
  - `languages` — `string[]`: language codes the user has (e.g. `["de", "el"]`).
  - `vocab-${languageCode}` — one per language: `VocabularyFile` (e.g. `vocab-de`, `vocab-el`).

All requests use `X-User-Id` so each user has their own languages and vocab files.

### Word (stored)

```ts
interface VocabWord {
  id: string;
  /** Word in the target language (e.g. "bis", "ακριβός"). */
  word: string;
  /** Translation(s), e.g. "until, till, 'til". */
  translation: string;
  /** User-defined topic tags (e.g. "basics", "travel"). Empty if none. */
  topicTags: string[];
  /** Last time the word was practiced (ISO date string). Omitted if never practiced. */
  lastPracticed?: string;
  /** Next review due date (ISO date string). Omitted if new/not in SRS. */
  nextDue?: string;
  /** Current SRS interval in days (0 = new). Used to compute next due after a review. */
  intervalDays?: number;
}
```

- **Not persisted**: `exportedAt` from import files is ignored.

### Vocabulary file (per language)

```ts
interface VocabularyFile {
  languageCode: string;  // e.g. "de", "el"
  words: VocabWord[];
}
```

### Duolingo import format (input only)

Imported JSON shape (not stored as-is):

```ts
interface DuolingoExport {
  exportedAt?: string;   // ignored, not persisted
  words: Array<{
    word: string;
    translation: string;
    lastPracticed?: string;
    skill?: string;
    strength?: string;
  }>;
}
```

- **Mapping**: `word` → `word`, `translation` → `translation`. `skill` can be used as an initial topic tag (if non-empty). New words get `topicTags: skill ? [skill] : []`, new `id`, and no `lastPracticed`/`nextDue`/`intervalDays` (treated as new for SRS).

## Spaced repetition (SRS)

- **New word**: `intervalDays` 0 or omitted; included in “practice” as “new” until first review.
- **Due**: `nextDue` missing or `nextDue <= today` (ISO date comparison).
- **Intervals (simplified ladder)**: 0 → 1 → 3 → 7 → 14 → 30 → 60 days. On **correct**: move to next step (or stay at 60). On **wrong**: reset to 0 (or 1).
- **After review**: set `lastPracticed = today` (ISO date), `nextDue = today + intervalDays`, `intervalDays` updated by rule above.

Practice session: select a language (and optional tag filter), then show words due + optionally cap new words per session. UI: show word or translation; user reveals the other side and rates correct/wrong (or easy/good/hard with same interval logic).

## Component architecture

```
VocabulistComponent (shell)
├── Router outlet: home | practice | word/:id (optional)
└── Optional: language in query or route

VocabHomeComponent
├── Language selector (dropdown or tabs): from VocabulistService.languages()
├── Word list for selected language (filter by topic tag, search)
├── Actions: Import JSON (file input), Add word, Start practice
├── Import: parse Duolingo JSON → map to VocabWord[] (no exportedAt), merge/replace for selected language
└── Uses VocabulistService (words, languages, importFromDuolingo, addWord, ...)

PracticeComponent
├── Route/query: language (required), optional tag filter
├── Load due words (+ optional new words) via VocabulistService.getDueWords(lang, tag?, limit)
├── Session: show card (word or translation), reveal other side, rate correct/wrong → recordReview(wordId, correct)
├── Progress: N due, M reviewed this session
└── Uses VocabulistService (recordReview, getDueWords)

WordDetailComponent (optional, for edit/delete)
├── Route: word/:id; resolve word from service by id
├── Edit: word, translation, topicTags (add/remove tags)
├── Delete word
└── Uses VocabulistService (updateWord, removeWord)
```

## Service responsibilities

- **VocabulistPersistenceService**: Load/save `languages` and `VocabularyFile` per language; user-switch clear and refetch. Expose signals: `languages()`, `wordsForLanguage(lang)` or current-language words.
- **VocabulistService**: Facade: list languages, add language (on first import), get words for language, add/update/remove word, import from Duolingo JSON (map, merge by word+translation or replace), getDueWords(lang, tag?, limit), recordReview(wordId, correct).

## Architecture

### Component and service interaction

```
VocabulistComponent (shell)
├── Page header + <router-outlet>
└── Children: vocab-home (default), practice, word/:id

VocabHomeComponent
├── Language selector; Import Duolingo JSON; Practice link
├── Tag filter + search; word list with links to word/:id
├── Uses VocabulistService (languages, currentLanguage, words, dueWords, setCurrentLanguage, importFromDuolingo)
└── OnInit: load(); queryParam lang → setCurrentLanguage

PracticeComponent
├── Query: lang (required), optional tag
├── effect: setCurrentLanguage(lang); effect: getDueWords → sessionWords (when index 0, reviewed 0)
├── Card: show word → Show translation → Correct/Wrong → recordReview
└── Uses VocabulistService (getDueWords, recordReview)

WordDetailComponent
├── Route param :id; query lang
├── effect: setCurrentLanguage(lang); effect: sync editWord/editTranslation/editTags from word()
├── Form: word, translation, topic tags (add/remove); Save, Delete
└── Uses VocabulistService (updateWord, removeWord)

VocabulistService (facade)
├── languages, currentLanguage, words, dueWords from persistence
├── setCurrentLanguage, load; importFromDuolingo (map, merge); addWord, updateWord, removeWord
├── getDueWords(tag?, limit?, includeNew?); recordReview(wordId, correct) → SRS ladder
└── Delegates persistence to VocabulistPersistenceService; uses duolingo-import.helper, srs.helper

VocabulistPersistenceService
├── languagesSignal, currentLanguageCode, wordsSignal (for current language only)
├── effect: user id change → clear; loadRequested && !loaded → fetchLanguages
├── load(); setCurrentLanguage(code) → fetch words for that code; saveWords(lang, words); saveLanguages(langs)
└── Store: keys languages, vocab-${languageCode} (VocabularyFile)
```

### Data flow

- **Import**: User selects language, picks file → parse JSON (Duolingo) → mapDuolingoToVocabWords (no `exportedAt`) → merge by word+translation → saveWords; add language to list if new.
- **Practice**: Select language → Practice?lang=de → setCurrentLanguage → getDueWords → show card → recordReview(correct) → update word's lastPracticed, nextDue, intervalDays.
- **User switch**: Persistence effect clears languages and words when profile().id changes; next load() refetches.

## Plugin registry

- **id**: `vocabulist`
- **path**: `vocabulist`
- **name**: `Vocabulist`
- **order**: 6
