import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { PluginStoreService } from '../../../core/services/plugin-store.service';
import { UserProfileService } from '../../../core/services/user-profile.service';

const PLUGIN_ID = 'journal';

/** Store key for a day: YYYY-MM-DD. Value: { content: string }. */
export type DateKey = string;

export interface JournalEntry {
  content: string;
}

/** Format a Date as YYYY-MM-DD for store key. */
export function toDateKey(d: Date): DateKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeEntry(raw: unknown): JournalEntry {
  if (raw && typeof raw === 'object' && 'content' in raw) {
    return { content: typeof (raw as Record<string, unknown>)['content'] === 'string' ? (raw as JournalEntry).content : '' };
  }
  if (typeof raw === 'string') return { content: raw };
  return { content: '' };
}

@Injectable({ providedIn: 'root' })
export class JournalService {
  private store = inject(PluginStoreService);
  private userProfile = inject(UserProfileService);

  private entrySignal = signal<JournalEntry | null>(null);
  private currentDateKey = signal<DateKey | null>(null);
  private entryDatesSignal = signal<DateKey[]>([]);

  readonly entry = this.entrySignal.asReadonly();
  readonly currentDateKeyReadonly = this.currentDateKey.asReadonly();
  readonly entryDates = this.entryDatesSignal.asReadonly();

  private userId = computed(() => this.userProfile.profile().id);
  private previousUserId: string | undefined;

  constructor() {
    effect(() => {
      const id = this.userProfile.profile().id;
      if (id !== this.previousUserId) {
        this.previousUserId = id;
        this.entrySignal.set(null);
        this.currentDateKey.set(null);
        this.entryDatesSignal.set([]);
        if (id) this.refreshEntryDates(id);
      }
    });
  }

  load(): void {
    const id = this.userId();
    if (!id) {
      this.entrySignal.set(null);
      this.entryDatesSignal.set([]);
      return;
    }
    this.refreshEntryDates(id);
    const key = this.currentDateKey();
    if (key) this.fetchEntry(id, key);
  }

  /** Switch to viewing/editing the given date and load its entry. */
  selectDate(dateKey: DateKey): void {
    const id = this.userId();
    this.currentDateKey.set(dateKey);
    if (id) this.fetchEntry(id, dateKey);
  }

  /** Load today's entry (e.g. on init or "Today" button). */
  goToToday(): void {
    this.selectDate(toDateKey(new Date()));
  }

  private fetchEntry(userId: string, dateKey: DateKey): void {
    this.store.get<unknown>(PLUGIN_ID, dateKey, userId).subscribe({
      next: (data) => this.entrySignal.set(normalizeEntry(data ?? null)),
      error: () => this.entrySignal.set({ content: '' }),
    });
  }

  private refreshEntryDates(userId: string): void {
    this.store.listKeys(PLUGIN_ID, userId).subscribe({
      next: (res) => {
        const keys = Array.isArray(res?.keys) ? (res.keys as string[]) : [];
        this.entryDatesSignal.set(keys.filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort().reverse());
      },
      error: () => this.entryDatesSignal.set([]),
    });
  }

  save(content: string): void {
    const id = this.userId();
    const key = this.currentDateKey();
    if (!id || !key) return;
    const entry: JournalEntry = { content: content.trim() };
    this.entrySignal.set(entry);
    this.store.put(PLUGIN_ID, key, entry, id).subscribe({
      next: () => {
        const dates = this.entryDatesSignal();
        if (!dates.includes(key)) this.entryDatesSignal.set([key, ...dates].sort().reverse());
      },
      error: () => {},
    });
  }

  /** Call after load() to set initial date to today. */
  setInitialDateToToday(): void {
    if (!this.currentDateKey()) this.goToToday();
  }
}
