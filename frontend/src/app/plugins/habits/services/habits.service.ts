import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PluginStoreService } from '../../../core/services/plugin-store.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { StravaService } from '../../runner/services/strava.service';
import type { Habit, HabitTarget, DateKey } from '../models/habit.model';

const RUNNING_HABIT_NAME = 'Running';

const PLUGIN_ID = 'habits';
const HABITS_KEY = 'habits';
const COMPLETIONS_KEY = 'completions';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function toDateKey(d: Date): DateKey {
  return d.toISOString().slice(0, 10);
}

export const DEFAULT_HABIT_COLORS = [
  '#58a6ff', '#3fb950', '#d29922', '#db6d28', '#bc8cff', '#f85149', '#79c0ff',
];

function normalizeTarget(t: unknown): Habit['target'] {
  if (!t || typeof t !== 'object') return undefined;
  const o = t as Record<string, unknown>;
  if (o['type'] === 'every_day') return { type: 'every_day' };
  if (o['type'] === 'days_per_week' && typeof o['days'] === 'number') {
    const days = Math.min(7, Math.max(1, Math.floor(o['days'])));
    return { type: 'days_per_week', days };
  }
  return undefined;
}

const DEFAULT_HABIT_ICON = '✓';

function normalizeHabit(h: unknown, index: number): Habit {
  if (h && typeof h === 'object' && 'id' in h && 'name' in h) {
    const o = h as Record<string, unknown>;
    const color = typeof o['color'] === 'string' && /^#[0-9a-fA-F]{6}$/.test(o['color'])
      ? (o['color'] as string)
      : DEFAULT_HABIT_COLORS[0];
    const icon = typeof o['icon'] === 'string' && o['icon'].trim() ? String(o['icon']).trim() : undefined;
    const order = typeof o['order'] === 'number' && Number.isFinite(o['order']) ? o['order'] : index;
    return {
      id: String(o['id']),
      name: String(o['name']),
      color,
      icon: icon || undefined,
      target: normalizeTarget(o['target']),
      order,
    };
  }
  return { id: generateId(), name: 'New habit', color: DEFAULT_HABIT_COLORS[0], order: index };
}

function normalizeCompletions(c: unknown): Record<DateKey, string[]> {
  if (c && typeof c === 'object' && !Array.isArray(c)) {
    const out: Record<string, string[]> = {};
    for (const [date, ids] of Object.entries(c as Record<string, unknown>)) {
      if (typeof date === 'string' && Array.isArray(ids)) {
        out[date] = ids.filter((id): id is string => typeof id === 'string');
      }
    }
    return out;
  }
  return {};
}

@Injectable({ providedIn: 'root' })
export class HabitsService {
  private store = inject(PluginStoreService);
  private userProfile = inject(UserProfileService);
  private strava = inject(StravaService);

  private habitsSignal = signal<Habit[]>([]);
  readonly habits = this.habitsSignal.asReadonly();

  private completionsSignal = signal<Record<DateKey, string[]>>({});
  readonly completions = this.completionsSignal.asReadonly();

  private userId = computed(() => this.userProfile.profile().id);
  private previousUserId: string | undefined;

  constructor() {
    effect(() => {
      const id = this.userProfile.profile().id;
      if (id !== this.previousUserId) {
        this.previousUserId = id;
        this.habitsSignal.set([]);
        this.completionsSignal.set({});
        if (id) this.load();
      }
    });
  }

  load(): void {
    const id = this.userId();
    if (!id) {
      this.habitsSignal.set([]);
      this.completionsSignal.set({});
      return;
    }
    forkJoin({
      habits: this.store.get<Habit[]>(PLUGIN_ID, HABITS_KEY, id).pipe(
        catchError(() => of([] as Habit[]))
      ),
      completions: this.store.get<Record<DateKey, string[]>>(PLUGIN_ID, COMPLETIONS_KEY, id).pipe(
        catchError(() => of({}))
      ),
    }).subscribe({
      next: ({ habits: habitsData, completions: completionsData }) => {
        const arr = Array.isArray(habitsData) ? habitsData : [];
        const normalized = arr.map((h, i) => normalizeHabit(h, i));
        normalized.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        this.habitsSignal.set(normalized);
        this.completionsSignal.set(normalizeCompletions(completionsData));
        this.ensureRunningHabitAndSync();
      },
    });
  }

  /**
   * If Runner plugin is enabled: ensure a "Running" habit exists and populate its
   * completions from recent Strava run activities.
   */
  private ensureRunningHabitAndSync(): void {
    const profile = this.userProfile.profile();
    const visible = profile.visiblePluginIds;
    if (!Array.isArray(visible) || !visible.includes('runner')) return;

    let habits = this.habitsSignal();
    let running = habits.find((h) => h.name.toLowerCase() === RUNNING_HABIT_NAME.toLowerCase());
    if (!running) {
      this.addHabit(RUNNING_HABIT_NAME);
      habits = this.habitsSignal();
      running = habits.find((h) => h.name.toLowerCase() === RUNNING_HABIT_NAME.toLowerCase());
    }
    if (!running) return;

    this.strava.checkConnection().subscribe((conn) => {
      if (!conn.connected) return;
      this.strava.loadActivities(1, 90).subscribe(() => {
        const activities = this.strava.activities();
        const dateKeys = new Set<string>();
        for (const a of activities) {
          const t = (a.type ?? '').toLowerCase();
          const s = (a.sport_type ?? '').toLowerCase();
          if (t !== 'run' && s !== 'run') continue;
          const iso = a.start_date_local ?? a.start_date;
          if (iso && iso.length >= 10) dateKeys.add(iso.slice(0, 10));
        }
        this.mergeRunDatesIntoCompletions(running!.id, dateKeys);
      });
    });
  }

  private mergeRunDatesIntoCompletions(habitId: string, dateKeys: Set<string>): void {
    if (dateKeys.size === 0) return;
    const comp = { ...this.completionsSignal() };
    let changed = false;
    for (const dateKey of dateKeys) {
      const list = comp[dateKey] ? [...comp[dateKey]] : [];
      if (list.includes(habitId)) continue;
      list.push(habitId);
      comp[dateKey] = list;
      changed = true;
    }
    if (changed) this.saveCompletions(comp);
  }

  saveHabits(habits: Habit[]): void {
    const uid = this.userId();
    if (!uid) return;
    const prev = this.habitsSignal();
    this.habitsSignal.set(habits);
    this.store.put(PLUGIN_ID, HABITS_KEY, habits, uid).subscribe({
      error: () => this.habitsSignal.set(prev),
    });
  }

  saveCompletions(completions: Record<DateKey, string[]>): void {
    const uid = this.userId();
    if (!uid) return;
    const prev = this.completionsSignal();
    this.completionsSignal.set(completions);
    this.store.put(PLUGIN_ID, COMPLETIONS_KEY, completions, uid).subscribe({
      error: () => this.completionsSignal.set(prev),
    });
  }

  createHabit(name: string): Habit {
    const list = this.habitsSignal();
    const used = new Set(list.map((h) => h.color).filter(Boolean));
    const color = DEFAULT_HABIT_COLORS.find((c) => !used.has(c)) ?? DEFAULT_HABIT_COLORS[0];
    const order = list.length === 0 ? 0 : Math.max(...list.map((h) => h.order ?? 0), -1) + 1;
    return {
      id: generateId(),
      name: name.trim() || 'New habit',
      color,
      icon: DEFAULT_HABIT_ICON,
      order,
    };
  }

  addHabit(name: string): void {
    const habit = this.createHabit(name);
    this.saveHabits([...this.habitsSignal(), habit]);
  }

  /** Reorder habits to the new order (array order); assigns order 0..n and saves. */
  reorderHabits(habits: Habit[]): void {
    const withOrder = habits.map((h, i) => ({ ...h, order: i }));
    this.saveHabits(withOrder);
  }

  updateHabit(habitId: string, updates: { name?: string; color?: string; icon?: string; target?: HabitTarget }): void {
    const habits = this.habitsSignal().map((h) => {
      if (h.id !== habitId) return h;
      const next = { ...h };
      if (updates.name !== undefined) next.name = updates.name.trim() || h.name;
      if (updates.color !== undefined) next.color = updates.color;
      if (updates.icon !== undefined) next.icon = updates.icon.trim() || undefined;
      if (updates.target !== undefined) next.target = updates.target;
      return next;
    });
    this.saveHabits(habits);
  }

  deleteHabit(habitId: string): void {
    const habits = this.habitsSignal().filter((h) => h.id !== habitId);
    const completions = { ...this.completionsSignal() };
    for (const date of Object.keys(completions)) {
      completions[date] = completions[date].filter((id) => id !== habitId);
      if (completions[date].length === 0) delete completions[date];
    }
    this.saveHabits(habits);
    this.saveCompletions(completions);
  }

  isCompleted(dateKey: DateKey, habitId: string): boolean {
    const completed = this.completionsSignal()[dateKey];
    return Array.isArray(completed) && completed.includes(habitId);
  }

  toggleCompletion(dateKey: DateKey, habitId: string): void {
    const comp = { ...this.completionsSignal() };
    const list = comp[dateKey] ? [...comp[dateKey]] : [];
    const idx = list.indexOf(habitId);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(habitId);
    if (list.length === 0) delete comp[dateKey];
    else comp[dateKey] = list;
    this.saveCompletions(comp);
  }

  /**
   * Current streak (consecutive days including today or ending yesterday).
   * Only meaningful for "every day" habits; returns 0 if no target or not every_day.
   */
  getStreak(habitId: string): number {
    const completions = this.completionsSignal();
    const completedSet = new Set<string>();
    for (const [date, ids] of Object.entries(completions)) {
      if (ids.includes(habitId)) completedSet.add(date);
    }
    const todayKey = toDateKey(new Date());
    if (completedSet.size === 0) return 0;
    // Walk backwards from today; if today not done, from yesterday
    let start = new Date();
    start.setHours(12, 0, 0, 0);
    if (!completedSet.has(todayKey)) {
      start.setDate(start.getDate() - 1);
    }
    let count = 0;
    for (;;) {
      const key = toDateKey(start);
      if (!completedSet.has(key)) break;
      count++;
      start.setDate(start.getDate() - 1);
    }
    return count;
  }
}
