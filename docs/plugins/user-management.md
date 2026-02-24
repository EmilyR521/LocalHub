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

## Architecture

### Component and service interaction

```
UserManagementComponent (shell)
├── Template: nav (Profile | Users) + <router-outlet>
└── No logic; routing only

MyProfileComponent
├── UserProfileService: profile(), load(), save(), updateProfile(), refreshProfile(), connectedApps
├── effect: applyProfile(profile()) → set name, emoji, theme, selectedPluginIds
├── Form state: name, emoji, theme, selectedPluginIds; saveStatus, disconnectingAppId
├── save() → build profile from form, userProfile.save()
├── disconnectApp(appId) → HTTP post to calendar/strava disconnect, then refreshProfile()
├── Plugins list from PLUGINS registry; togglePlugin, selectAll, selectNone
└── Single responsibility: profile form and connected-app disconnect

AllUsersComponent
├── UserProfileService: profile(), switchUser(), load()
├── usersList (signal); currentUserId, usersForSelect (computed)
├── loadUsers() → GET /api/plugins/user-management/users
├── onUserSelect(userId) → disconnectUserFromExternalApps(currentId) then doSwitchUser(userId)
├── addUser() → generateUserId(), switchUser(newId), loadUsers()
└── Single responsibility: list users and switch/add user

UserProfileService (core)
├── profile (signal); load(), save(), switchUser(id), refreshProfile(), updateProfile()
├── Persists current user id in localStorage; store key user-management/profile with userId in header
└── All plugins that store per-user data react to profile().id for clearing on switch
```

### Data flow

- **Switch user**: AllUsersComponent calls UserProfileService.switchUser(userId), which persists id and reloads profile. Other plugins’ services react to profile().id change and clear their in-memory state so the next load is for the new user.
- **Profile save**: MyProfileComponent → UserProfileService.save(profile) → store.put with profile.id.

## Plugin registry

- **id**: `user-management`
- **path**: `user-management`
- **name**: `User management`
- **order**: 99 (last in sidebar)
