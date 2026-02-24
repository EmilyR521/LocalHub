# Reader plugin

## Purpose

Book and reading list tracking: maintain a list of books with status (to read, reading, finished, on hold, abandoned), ratings, dates, tags, and notes. Collections group books into named lists. Based on the standalone Books app, adapted to the LocalHub plugin architecture with per-user JSON store persistence.

## Features implemented

- **Books**: Full CRUD; table view with sort (title, author, status, added date, finished date) and status filter; add/edit/delete via slide-out panel and book form (title, author, status, rating, reading dates, notes, tags).
- **Collections**: Create, rename, delete; add/remove books; list view with books per collection; click book to open edit panel.
- **Timeline**: View books grouped by month (by finished or start date); only books with a reading start date appear; stats (to read / reading / finished / total); book cards with cover, dates, status, rating.
- **Import / export**:
  - **CSV**: Export template or data; import from CSV (Title, Author required; status, dates, notes, tags supported); duplicates skipped by title+author.
  - **JSON**: Export backup (books + collections); import with **Replace** (overwrite) or **Merge** (dedupe by title+author for books, by name for collections; collection book IDs remapped).
- **Settings**: Cog opens drawer with import/export only (no separate settings model).
- **Per-user storage**: Books and collections are stored per user (`X-User-Id` header). Each user has `books.json` and `collections.json` under `data/plugins/reader/{userId}/`.

## Data model

- **Store**: plugin ID `reader`.
- **Keys**: `books`, `collections`.
- **Per-user files**: `data/plugins/reader/{userId}/books.json`, `data/plugins/reader/{userId}/collections.json`. User id comes from the user-management profile (and optionally from `localStorage` if profile load fails).

### Book

```ts
interface Book {
  id: string;
  title: string;
  author: string;
  addedDate: string;       // ISO date string
  status: BookStatus;
  readingStartDate?: string;
  readingEndDate?: string;
  publishedDate?: string;
  notes?: string;
  tags?: string[];
  imageUrl?: string;
  rating?: BookRating;
  owned?: BookOwned;
}

enum BookStatus {
  ToRead = 'to read',
  Reading = 'reading',
  Finished = 'finished',
  OnHold = 'on hold',
  Abandoned = 'abandoned'
}

enum BookRating {
  None = 'none',
  Positive = 'positive',
  Negative = 'negative',
  Favourite = 'favourite'
}

enum BookOwned {
  NotOwned = 'not owned',
  Physical = 'physical',
  Digital = 'digital',
  Loaned = 'loaned'
}
```

### Collection

```ts
interface Collection {
  id: string;
  name: string;
  bookIds: string[];
  createdDate: string;     // ISO date string
}
```

## API (plugin store)

- `GET /api/plugins/reader/store/books` — returns `Book[]`. Send `X-User-Id` for per-user data.
- `PUT /api/plugins/reader/store/books` — body: `Book[]`; saves entire list. Send `X-User-Id` for per-user data.
- `GET /api/plugins/reader/store/collections` — returns `Collection[]`. Send `X-User-Id` for per-user data.
- `PUT /api/plugins/reader/store/collections` — body: `Collection[]`; saves entire list. Send `X-User-Id` for per-user data.

No custom backend routes; all persistence via the shared plugin store. The frontend uses the store with the current user id from the user-management profile.

## Design choices

- **Single responsibility / maintainability**:
  - **ReaderPersistenceService**: Only loads and persists books/collections for the current user (signals, effect for “load when user id available”, `saveBooks` / `saveCollections`). No domain logic.
  - **ReaderService**: Facade for domain operations (add/update/remove book, collections CRUD, replaceAll, mergeFromExport). Delegates persistence to `ReaderPersistenceService` and bulk-merge logic to a helper. Components depend only on `ReaderService`.
  - **reader-store.constants.ts**: Plugin id, store keys, and `generateId()` in one place.
  - **reader-merge.helper.ts**: Pure functions for ensuring book/collection ids and for merging imports (dedupe, id mapping). No Angular; easy to test.
  - **reader-csv.parser.ts**: CSV build/parse (headers, rows, escaping, dates, status). Keeps **ReaderImportExportService** focused on file I/O (FileReader, download) and flow (parse → process → emit).
  - **reader-books-list.helper.ts**: Filter and sort books (by status, by field/direction). Used by the main Reader component so the component stays thin.
- **Timeline**: **TimelineService** builds month groups from books (filter by start date, sort, group by month). Presentational components (timeline header, timeline book item) stay dumb; **ReaderTimelineComponent** composes them and uses `ReaderService.books()`.
- **Load timing**: An effect in `ReaderPersistenceService` runs when both “load requested” and “user id available” are true, then fetches books and collections. This avoids races on refresh (profile may load after the reader route activates).
- **User id fallback**: If the profile API fails on load, the user-management service restores the last known user id from `localStorage` so the reader can still load that user’s data.

## UI design

- **Layout**: Uses the shared **settings drawer host** (`app-settings-drawer-host`): toolbar with "Reader" label and a cog; cog opens the settings drawer (import/export).
- **Tabs**: Books | Collections | Timeline. Books: table + add button + status filter + sortable columns; row click opens book form panel. Collections: list of collections with books; create/rename/delete; add/remove books; book click opens form. Timeline: month groups and book cards; book click opens form.
- **Book form**: Add or edit — title, author (required); status; rating (thumbs up/down/favourite); started/finished dates; notes; tags. Save / Cancel. Delete when editing.

Use shared app styles: `.page-header`, `.card`, `.btn`, `.field`, `.checkbox-label`, `.data-table`, etc.

## Architecture

### Component and service interaction

```
ReaderComponent (shell)
├── Calls ReaderService.load() on init
├── Holds: panelOpen, editingBook, activeTab, statusFilter, sortField/sortDir
├── Uses: ReaderService.books, filteredAndSortedBooks (computed from helper)
├── Books tab: table + BookForm in overlay; openEdit → panel
├── Collections tab: ReaderCollectionsComponent → (viewBook) → openEdit
├── Timeline tab: ReaderTimelineComponent → (viewBook) → openEdit
└── Settings drawer: ReaderSettingsComponent (import/export)

ReaderService (facade)
├── Exposes: books, collections (from ReaderPersistenceService)
├── load() → ReaderPersistenceService.load()
├── addBook / updateBook / removeBook → persistence.saveBooks (and collections when removing)
├── createCollection, addBookToCollection, removeBookFromCollection, updateCollection, deleteCollection
├── replaceAll, mergeFromExport (delegate to reader-merge.helper)
└── No UI; single responsibility: coordinate CRUD and bulk operations

ReaderPersistenceService
├── booksSignal, collectionsSignal (readonly exposed)
├── effect: on profile().id change → clear signals, set loaded=false; on loadRequested && !loaded → fetchBooksAndCollections(id)
├── load() → sets loadRequested; user switch clears state so next load fetches new user
├── saveBooks / saveCollections → PluginStoreService.put with current user id
└── Single responsibility: load/persist per user; no domain logic

ReaderTimelineComponent → ReaderService.books, TimelineService.buildTimeline(); (viewBook) → parent
ReaderCollectionsComponent → ReaderService.collections/books, CRUD; (viewBook) → parent
BookFormComponent → presentational; (save)/(cancel)/(delete) → parent
ReaderSettingsComponent → ReaderImportExportService, ReaderService.replaceAll/mergeFromExport
TimelineService → pure: buildTimeline(books) → TimelineGroup[]
```

### Data flow

- **Load**: ReaderComponent.ngOnInit → ReaderService.load() → ReaderPersistenceService.loadRequested = true; effect runs when profile().id is set and fetches books/collections from PluginStoreService.
- **User switch**: UserProfileService.profile().id changes → ReaderPersistenceService effect clears books/collections and loadedUserId; next load() triggers fetch for new user.
- **Mutate**: Component → ReaderService.addBook/updateBook/… → ReaderPersistenceService.saveBooks/saveCollections → PluginStoreService.put.

## Plugin registry

- **id**: `reader`
- **path**: `reader`
- **name**: `Reader`
- **order**: 1
