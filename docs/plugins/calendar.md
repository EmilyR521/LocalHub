# Calendar plugin

Calendar shows a monthly view and can connect to Google Calendar. Events are loaded from the Google Calendar API.

## Auth: 401 / 403 when loading events

If the app shows **401 Unauthorized** or **403 Forbidden** when loading calendar events (e.g. `GET .../api/plugins/calendar/google/events`), the backend could not get a valid Google access token for the current user. Resolutions:

### 1. Reconnect Google Calendar (most common)

- Open **Calendar** in the sidebar, then open **Settings** (⚙️).
- Click **Disconnect**, then **Connect to Google Calendar** again and complete sign-in.
- This stores a refresh token for your current user so the events API can work.

Use this if:

- You connected **before** the monthly calendar view was added (tokens were not stored then).
- You cleared app data or switched browser/device (profile or tokens no longer match).
- Google revoked or expired the refresh token.

### 2. Same profile as when you connected

- The backend stores tokens per **user id** (from User management profile).
- Ensure you’re using the same profile that was used when you clicked “Connect to Google Calendar”.
- If you never saved your profile in **User management**, do that first, then reconnect in Calendar settings so tokens are stored under a stable id.

### 3. Backend Google OAuth config

- The events API uses a **refresh token** to get access tokens. That only works if the backend has valid Google OAuth credentials.
- Set in the backend environment:
  - `GOOGLE_CLIENT_ID` – OAuth 2.0 client ID (Web application).
  - `GOOGLE_CLIENT_SECRET` – OAuth client secret.
- In Google Cloud Console, the OAuth client must have the redirect URI:  
  `http://localhost:3000/api/plugins/calendar/google/callback` (or your backend base URL + that path).
- If these are missing or wrong, token refresh fails and the API returns 403.

### 4. Backend returns 403 (not 401)

- The backend returns **403 Forbidden** with body `{ "error": "Not connected to Google Calendar", "code": "calendar_not_connected" }` when it has no valid tokens for the requesting user.
- The frontend shows a message asking you to disconnect and connect again in Calendar settings.

## Architecture

### Component and service interaction

```
CalendarComponent (shell)
├── CalendarGoogleService.load(); CalendarDisplayService.load()
├── queryParams: connected=1 → refreshConnection; error → oauthError message
├── Template: oauthError | connection ? (month-view or “connect in settings”) | “Loading…”
└── Settings drawer: CalendarSettingsComponent

CalendarMonthViewComponent
├── CalendarGoogleService: connection, getEvents(year, month)
├── CalendarDisplayService: displayHabits, displayGoogleCalendar, displayReading, themeColor
├── HabitsService.habits + completions (when displayHabits); ReaderService.books (when displayReading)
├── effect: connection?.connected && displayGoogleCalendar → fetchEvents(viewYear, viewMonth)
├── effect: displayHabits → habitsService.load(); displayReading → readerService.load()
├── viewYear, viewMonth; grid/rows computed from events + habitsByDay + readingByDay
├── prevMonth/nextMonth; eventStyles, dateKey, isToday
└── Single responsibility: compose month grid and fetch events; date logic in component

CalendarGoogleService
├── connection (signal); authUrlError; loaded, loadRequested, previousUserId
├── effect: profile().id change → clear connection, set loaded=false
├── effect: id && loadRequested && !loaded → loadConnection(id) (store.get)
├── load(), getAuthUrl(), disconnect(), getEvents(year, month), refreshConnection()
└── Single responsibility: Google Calendar connection state and API per user

CalendarDisplayService
├── optionsSignal → displayHabits, displayGoogleCalendar, displayReading, themeColor
├── effect: profile().id change → clear optionsSignal to defaults; next load() for new user
├── load() → store.get display-options; setDisplayHabits/setDisplayGoogleCalendar/setDisplayReading/setThemeColor → updateOptions → store.put
└── Single responsibility: calendar view options per user
```

### Data flow

- **User switch**: CalendarGoogleService and CalendarDisplayService clear state when profile().id changes; load() fetches for new user.
- **Month view**: Depends on Reader and Habits when display options are on; those services load their own data (and respect user id).
