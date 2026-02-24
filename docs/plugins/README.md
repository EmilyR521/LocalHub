# Plugin architecture

Each plugin is a feature of LocalHub with its own UI (Angular lazy-loaded routes) and optional server-side storage via the plugin store API. All user-scoped data is keyed by the current user id from **UserProfileService**; plugins that hold in-memory state must clear and reload when the active user changes.

## Documentation index

| Plugin | Description | Architecture |
|--------|-------------|--------------|
| [Reader](reader.md) | Book/reading list: books, status, ratings, collections, timeline. | [reader.md#architecture](reader.md#architecture) |
| [Runner](runner.md) | Strava activities, run planner, add runs to Google Calendar. | [runner.md#architecture](runner.md#architecture) |
| [Calendar](calendar.md) | Monthly view, Google Calendar events, habits/reading overlays. | [calendar.md#architecture](calendar.md#architecture) |
| [Lists](lists.md) | Bulleted lists and checklists. | [lists.md#architecture](lists.md#architecture) |
| [Habits](habits.md) | Habits with daily completion and optional Strava sync. | [habits.md#architecture](habits.md#architecture) |
| [User Management](user-management.md) | Profile (name, emoji, theme), visible plugins, switch user. | [user-management.md#architecture](user-management.md#architecture) |

## Reusable patterns

- **Settings drawer**: Use **SettingsDrawerHostComponent** (`app-settings-drawer-host`) for a toolbar with optional title and a cog that opens a right-hand settings drawer. See Reader, Runner, Calendar.
- **User-scoped load**: For plugins that store data per user, use an **effect** that reacts to `UserProfileService.profile().id`. When the id changes, clear in-memory state and set a “not loaded” flag so the next `load()` fetches for the new user. See Reader (ReaderPersistenceService), StravaService, CalendarGoogleService, RunnerPlanService, ListsService, HabitsService, CalendarDisplayService.
- **Single responsibility**: Prefer a **persistence service** (load/save, user-switch reset) and a **domain/facade service** (CRUD, business rules). Components depend on the facade only.

## Adding a new plugin

1. Add design and documentation under `docs/plugins/<plugin-id>.md`.
2. Implement backend: use the store API only, or add a custom router under `backend/src/plugins/<plugin-id>/`.
3. Add the Angular feature under `frontend/src/app/plugins/<plugin-id>/` and register it in `plugin-registry.ts` and `app.routes.ts`.
4. For a settings UI: wrap your plugin template in `<app-settings-drawer-host [title]="'Plugin Name'">`, project main content into `ng-container main` and settings into `ng-container settings`.
