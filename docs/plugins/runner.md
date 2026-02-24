# Runner plugin

## Purpose

Plan runs (repeated or ramp-up), view recent Strava activities, and add planned runs to Google Calendar. Strava connection and run plan are stored per user.

## Features

- **Recent runs**: List of Strava activities (current year); connect Strava in settings; OAuth callback handled via query params.
- **Run planner**: Build a schedule (repeated weekly distances or ramp-up to a goal); edit run distances; add/remove runs to/from Google Calendar (via Calendar plugin API).
- **Settings**: Strava connect/disconnect; run plan and calendar event color persisted per user.

## Data model

- **Strava**: Backend holds OAuth tokens per user; frontend holds connection state and activities in **StravaService** (signals).
- **Run plan**: Plugin store `runner` / `plan` (RunnerPlan); `calendarEventColorId`; `calendarEventIds` (for removal).

## Architecture

### Component and service interaction

```
RunnerComponent (shell)
├── OnInit: StravaService.checkConnection(); queryParams 'strava=connected' → refreshConnection
├── Router outlet: recent | planner
├── Settings drawer: RunnerSettingsComponent (Strava connect/disconnect)
└── No direct data; children use services

RecentRunsComponent
├── StravaService: connected, activities, loading, error
├── currentYearActivities = computed filter of activities
├── OnInit: userProfile.load(); checkConnection(); loadActivities(1,30); queryParams for strava=connected|error
└── formatDistance, formatDuration, formatDate (from utils/activity-format)

RunPlannerComponent
├── RunnerPlanService: plan, schedule, eventColorId, calendarEventIds
├── Local state: mode, availableDays, distancesByDay, weeksToShow, longRunDays, goalDate, goalDistanceKm, startDistanceKm
├── effect: sync local state from runnerPlan.plan(); sync editableRuns from schedule
├── generatePlan() → RunnerPlanService.save(plan)
├── addToCalendar() / removeFromCalendar() → RunnerPlanService observables
└── OnInit: runnerPlan.load()

StravaService
├── connection, connected, activities, loading, error, authUrlError (signals)
├── effect: profile().id change → clear connection, activities, connected
├── checkConnection(), loadActivities(), disconnect(), getAuthUrl(), connectToStrava(), refreshConnection()
├── All API calls send X-User-Id from UserProfileService
└── Single responsibility: Strava API and connection state per user

RunnerPlanService
├── plan, schedule (from buildSchedule), userHasGenerated, eventColorId, calendarEventIds (signals)
├── effect: profile().id change → clear plan/schedule/eventIds, set loaded=false; when id && loadRequested && !loaded → doLoad(id)
├── load(), save(plan), setEventColorId(), addRunsToCalendar(runs), removeRunsFromCalendar()
├── Persists plan and calendarEventIds via PluginStoreService; calendar events via HTTP to Calendar plugin API
└── buildSchedule (repeated/ramp-up) in same file; normalizePlan/defaultPlan
```

### Data flow

- **Strava**: User switch clears connection/activities in StravaService. Recent runs and settings use same service.
- **Run plan**: User switch clears plan and schedule; RunPlannerComponent calls load() on init so new user gets their plan (or empty).
- **Calendar**: addRunsToCalendar uses Calendar plugin API with X-User-Id; event IDs stored in plugin store per user.

## Plugin registry

- **id**: `runner`
- **path**: `runner`
- **name**: `Runner`
- **order**: 2
