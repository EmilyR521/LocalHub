# Lists plugin

## Purpose

Create and edit bulleted lists or checklists. Each list has a title, optional icon, type (bulleted | checklist), and items (title, optional details, and for checklists a checked flag). Data is stored per user.

## Features

- **List home**: List of all lists; create (navigates to new list), delete with confirm.
- **List detail**: Inline editable title and icon; type toggle; add/remove/edit items; toggle check for checklist items; delete list.

## Data model

- **Store**: plugin ID `lists`, key `lists` — single array of List.
- **List**: id, title, type ('bulleted' | 'checklist'), icon?, items[].
- **ListItem**: id, title, details?, checked? (checklist only).

## Architecture

### Component and service interaction

```
ListsComponent (shell)
├── Template: page header + <router-outlet>
├── OnInit: ListsService.load()
└── No local state; children own UI state

ListHomeComponent
├── lists = ListsService.lists
├── createList() → service.createList(), save(list), navigate to /:id
├── deleteList(list) → confirm, service.deleteList(id)
└── listTypeLabel(type) for display

ListDetailComponent
├── Route param :id → currentId signal; effect: derive list from listsService.lists() by id
├── list = readonly signal of current list (or null)
├── editingTitle, editingItemId; title/item focus via viewChild + afterNextRender
├── All mutations: update listSignal then ListsService.save(list) — e.g. setTitle, setIcon, setType, toggleItem, setItemTitle, setItemDetails, addItem, removeItem
├── deleteList() → confirm, service.deleteList(), navigate to /plugins/lists
└── OnInit: listsService.load(); paramMap → currentId

ListsService
├── listsSignal (readonly lists)
├── effect: profile().id change → clear listsSignal; so next load() is for new user
├── load() → PluginStoreService.get with current user id; normalize list/items; set listsSignal
├── save(list) → update in-memory array, put full array to store
├── deleteList(id) → filter out, put
├── createList() → new List (no save)
├── addItem(list, title?) → new ListItem (no save)
└── Single service: persistence + CRUD; normalizeList/normalizeItem in same file
```

### Data flow

- **Load**: ListsComponent.ngOnInit → load(); when user switches, effect clears lists; next visit or load() fetches new user's lists.
- **Mutate**: ListDetailComponent or ListHomeComponent → ListsService.save(list) or deleteList → in-memory update + store.put.

### Refactor notes

- **Single responsibility**: ListsService currently does both persistence and domain CRUD. Optional split: a ListsPersistenceService (load/save, user-switch clear) and ListsService (facade) would mirror Reader pattern; current single service is acceptable for scope.
- **User switch**: Implemented via effect that clears lists when profile().id changes so each user only sees their own data after switch.

## Plugin registry

- **id**: `lists`
- **path**: `lists`
- **name**: `Lists`
- **order**: 4
