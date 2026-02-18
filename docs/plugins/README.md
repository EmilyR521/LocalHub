# Plugin apps

Each plugin is a feature of LocalHub with its own UI (Angular lazy-loaded module) and optional server-side storage via the plugin store API.

## Documentation index

| Plugin | Description |
|--------|-------------|
| [Reader](reader.md) | Book/reading list tracking: books, status, ratings, dates, tags, collections. |
| [User Management](user-management.md) | User profile (name, emoji) and which plugin apps are visible in the hub. |

## Reusable patterns

- **Settings drawer**: Plugins that need a settings UI can use the shared **SettingsDrawerHostComponent** (`app-settings-drawer-host`). It provides a top toolbar with an optional title and a cog button in the top right; clicking the cog opens a right-hand drawer where the plugin projects its settings content. See Reader plugin for usage.

## Adding a new plugin

1. Add design and documentation under `docs/plugins/<plugin-id>.md`.
2. Implement backend: use the store API only, or add a custom router under `backend/src/plugins/<plugin-id>/`.
3. Add the Angular feature under `frontend/src/app/plugins/<plugin-id>/` and register it in `plugin-registry.ts` and `app.routes.ts`.
4. To add a settings UI: wrap your plugin template in `<app-settings-drawer-host [title]="'Plugin Name'">`, project main content into `ng-container main` and settings into `ng-container settings`.
