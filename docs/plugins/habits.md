# Habits plugin

## Purpose

Define habits and mark them completed per day. Optional “Running” habit is synced from Strava run activities when the Runner plugin is visible. Data is stored per user.

## Features

- **Habit list**: Add habit (name); drag-and-drop reorder; open config (name, color, icon, target: every day or N days/week).
- **Dot matrix**: Four weeks (current + three previous); toggle completion per day; week goal met indicator; streak.
- **Running sync**: If Runner is visible, ensure a “Running” habit exists and merge Strava run dates into its completions.

## Data model

- **Store**: plugin ID `habits`, keys `habits` (Habit[]) and `completions` (Record<DateKey, string[]>).
- **Habit**: id, name, color?, icon?, target? (every_day | days_per_week), order.
- **DateKey**: YYYY-MM-DD; completions[dateKey] = habit ids completed that day.

## Architecture

### Component and service interaction

```
HabitsComponent (shell)
├── Template: page header + <router-outlet>
├── OnInit: HabitsService.load()
└── No local state

HabitHomeComponent (single route)
├── habits = HabitsService.habits; completions from service
├── dotMatrixRows = computed getFourWeeksGrid(); yearMonthBlocks = computed getYearMonthBlocks(selectedDetailYear)
├── editingHabit, configName, configColor, configIcon, configTarget (modal/config state)
├── isCompleted(dateKey, habitId), toggleDot() → HabitsService
├── openConfig(habit), saveConfig(), deleteHabit(), addHabit() → service
├── weekGoalMet(), streak(), yearsWithData(); drag/drop reorder → reorderHabits
├── Pure helpers in file: getFourWeeksGrid, getDayLetter, getYearMonthBlocks (date logic)
└── Single responsibility: UI and user actions; no persistence

HabitsService
├── habits, completions (readonly signals)
├── effect: profile().id change → clear habitsSignal and completionsSignal; next load() is for new user
├── load() → forkJoin habits + completions from store; normalize; ensureRunningHabitAndSync() if runner visible
├── ensureRunningHabitAndSync: create "Running" habit if missing; StravaService.checkConnection + loadActivities; merge run dates into completions
├── saveHabits, saveCompletions (optimistic update; revert on error)
├── createHabit, addHabit, reorderHabits, updateHabit, deleteHabit
├── isCompleted, toggleCompletion, getStreak
└── Single service: persistence + domain + Strava sync; toDateKey exported
```

### Data flow

- **Load**: HabitsComponent.ngOnInit → load(); user switch clears habits/completions; next load() fetches new user and may create/sync Running habit.
- **Mutate**: HabitHomeComponent → HabitsService add/update/delete/reorder/toggleCompletion → saveHabits/saveCompletions → store.put.

### Refactor notes

- **Cross-plugin**: HabitsService injects StravaService for Running habit sync; keep this in one place (service) rather than component.
- **User switch**: Effect clears state when profile().id changes so each user sees only their habits and completions.

## Plugin registry

- **id**: `habits`
- **path**: `habits`
- **name**: `Habits`
- **order**: 5
