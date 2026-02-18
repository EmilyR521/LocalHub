# User Management plugin

## Purpose

Lets the user set their display name and emoji icon, and choose which plugin apps appear in the hub sidebar. There is a single “current user” profile (no multi-user auth in this version).

## Data model

- **Store**: plugin ID `user-management`, single key `profile`.
- **File**: `data/plugins/user-management/profile.json`.

### Profile shape

```ts
interface UserProfile {
  name: string;           // Display name
  emoji: string;         // Single emoji (e.g. "👤" or "🏠")
  visiblePluginIds: string[];  // Plugin IDs to show in sidebar; empty = show all
}
```

- Defaults if missing: `name: ""`, `emoji: "👤"`, `visiblePluginIds: []` (show all).

## API (plugin store)

- `GET /api/plugins/user-management/store/profile` — returns current profile JSON.
- `PUT /api/plugins/user-management/store/profile` — body: `UserProfile`; saves and returns saved object.

No custom backend routes; uses the shared plugin store only.

## UI design

### Screens

1. **Profile**
   - Text input: display name.
   - Emoji input: single character or short string (e.g. one emoji); optional preset buttons for common emojis.
   - Save button; success/error feedback.

2. **Visible plugins**
   - List of all registered plugins (from plugin registry) as checkboxes or toggles.
   - “Show all” / “Hide all” shortcuts.
   - Saving updates `visiblePluginIds` in the same profile; hub sidebar reflects changes after save (or on next load).

### Layout

- Single page or two sections (Profile + Visible plugins) with clear headings.
- Use existing hub styles (CSS variables, card/surface styling).

## Hub integration

- Hub (or a shared service) loads profile via `GET .../user-management/store/profile`.
- Sidebar:
  - Renders only plugins whose `id` is in `visiblePluginIds`, or all plugins if `visiblePluginIds` is empty.
  - Optionally shows current user name/emoji in the sidebar header or footer.

## Plugin registry

- **id**: `user-management`
- **path**: `user-management`
- **name**: `User management` (or “Settings”)
- **order**: high (e.g. 99) so it appears last in the sidebar.
