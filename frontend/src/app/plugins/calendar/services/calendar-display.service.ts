import { Injectable, inject, signal, computed } from '@angular/core';
import { PluginStoreService } from '../../../core/services/plugin-store.service';
import { UserProfileService } from '../../../core/services/user-profile.service';

const PLUGIN_ID = 'calendar';
const STORE_KEY = 'display-options';

/** Hex colour for calendar accent (e.g. today, events). Empty = use app default. */
export interface CalendarDisplayOptions {
  displayHabits: boolean;
  displayGoogleCalendar: boolean;
  displayReading: boolean;
  themeColor: string;
}

const DEFAULTS: CalendarDisplayOptions = {
  displayHabits: true,
  displayGoogleCalendar: true,
  displayReading: true,
  themeColor: '',
};

const THEME_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

function normalize(op: unknown): CalendarDisplayOptions {
  if (op && typeof op === 'object' && 'displayHabits' in op && 'displayGoogleCalendar' in op && 'displayReading' in op) {
    const o = op as Record<string, unknown>;
    const theme = typeof o['themeColor'] === 'string' && THEME_COLOR_REGEX.test(o['themeColor']) ? o['themeColor'] : '';
    return {
      displayHabits: o['displayHabits'] === true,
      displayGoogleCalendar: o['displayGoogleCalendar'] !== false,
      displayReading: o['displayReading'] === true,
      themeColor: theme,
    };
  }
  return { ...DEFAULTS };
}

@Injectable({ providedIn: 'root' })
export class CalendarDisplayService {
  private store = inject(PluginStoreService);
  private userProfile = inject(UserProfileService);

  private optionsSignal = signal<CalendarDisplayOptions>({ ...DEFAULTS });
  readonly displayHabits = computed(() => this.optionsSignal().displayHabits);
  readonly displayGoogleCalendar = computed(() => this.optionsSignal().displayGoogleCalendar);
  readonly displayReading = computed(() => this.optionsSignal().displayReading);
  readonly themeColor = computed(() => this.optionsSignal().themeColor);

  private userId = computed(() => this.userProfile.profile().id);

  load(): void {
    const id = this.userId();
    if (!id) return;
    this.store.get<CalendarDisplayOptions>(PLUGIN_ID, STORE_KEY, id).subscribe({
      next: (data) => this.optionsSignal.set(normalize(data)),
      error: () => this.optionsSignal.set({ ...DEFAULTS }),
    });
  }

  setDisplayHabits(value: boolean): void {
    this.updateOptions({ displayHabits: value });
  }

  setDisplayGoogleCalendar(value: boolean): void {
    this.updateOptions({ displayGoogleCalendar: value });
  }

  setDisplayReading(value: boolean): void {
    this.updateOptions({ displayReading: value });
  }

  setThemeColor(value: string): void {
    const next = value && THEME_COLOR_REGEX.test(value) ? value : '';
    this.updateOptions({ themeColor: next });
  }

  private updateOptions(partial: Partial<CalendarDisplayOptions>): void {
    const id = this.userId();
    if (!id) return;
    const prev = this.optionsSignal();
    const next = { ...prev, ...partial };
    this.optionsSignal.set(next);
    this.store.put(PLUGIN_ID, STORE_KEY, next, id).subscribe({
      error: () => this.optionsSignal.set(prev),
    });
  }
}
