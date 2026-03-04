import { Injectable, signal, computed } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { PluginStoreService } from './plugin-store.service';

export type ThemeMode = 'light' | 'dark' | 'classic' | 'custom';

/** CSS variable names that users can customize in a custom theme. */
export const CUSTOM_THEME_KEYS = [
  '--bg',
  '--surface',
  '--border',
  '--text',
  '--text-muted',
  '--accent',
  '--error',
] as const;

export type CustomThemeKey = (typeof CUSTOM_THEME_KEYS)[number];

export interface CountdownItem {
  id: string;
  title: string;
  emoji: string;
  /** Event date in YYYY-MM-DD. */
  eventDate: string;
}

export interface UserProfile {
  id?: string;
  name: string;
  emoji: string;
  visiblePluginIds: string[];
  /** Dashboard widget IDs to show, in order. Defaults to ['currently-reading'] when empty. */
  dashboardWidgetIds?: string[];
  /** Countdown widgets: title, emoji, event date. */
  countdownItems?: CountdownItem[];
  /** UI theme. Defaults to 'dark' when unset. Use 'custom' with customTheme for user-defined colors. */
  theme?: ThemeMode;
  /** When theme is 'custom', these CSS variable overrides are applied (e.g. { '--bg': '#0f1419' }). */
  customTheme?: Partial<Record<CustomThemeKey, string>>;
  /** Plugin IDs that have external API authorisation (e.g. 'calendar', 'strava'). */
  connectedApps?: string[];
  /** Plugin IDs in sidebar order. When set, sidebar uses this order; otherwise default registry order. */
  pluginOrderIds?: string[];
}

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  emoji: '👤',
  visiblePluginIds: [],
  dashboardWidgetIds: [],
  connectedApps: [],
};

function generateUserId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `user-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function normalizeCountdownItems(
  items: CountdownItem[] | null | undefined
): CountdownItem[] {
  if (!Array.isArray(items)) return [];
  return items.filter(
    (c) =>
      c &&
      typeof c.id === 'string' &&
      typeof c.title === 'string' &&
      typeof c.emoji === 'string' &&
      typeof c.eventDate === 'string'
  );
}

const PLUGIN_ID = 'user-management';
const KEY = 'profile';
const USER_ID_STORAGE_KEY = 'localhub-user-id';

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private profileSignal = signal<UserProfile>(DEFAULT_PROFILE);
  private loaded = false;

  /** Generate a new user ID (for add user). */
  static generateUserId(): string {
    return generateUserId();
  }

  readonly profile = this.profileSignal.asReadonly();
  readonly name = computed(() => this.profileSignal().name);
  readonly emoji = computed(() => this.profileSignal().emoji);
  readonly visiblePluginIds = computed(() => this.profileSignal().visiblePluginIds);
  readonly dashboardWidgetIds = computed(() => {
    const ids = this.profileSignal().dashboardWidgetIds;
    return Array.isArray(ids) && ids.length > 0 ? ids : ['currently-reading'];
  });

  readonly theme = computed(() => {
    const t = this.profileSignal().theme;
    return t === 'light' || t === 'dark' || t === 'classic' || t === 'custom' ? t : 'dark';
  });

  readonly customTheme = computed(() => {
    const ct = this.profileSignal().customTheme;
    if (!ct || typeof ct !== 'object') return {};
    return { ...ct };
  });

  readonly connectedApps = computed(() => {
    const apps = this.profileSignal().connectedApps;
    return Array.isArray(apps) ? apps : [];
  });

  readonly pluginOrderIds = computed(() => {
    const ids = this.profileSignal().pluginOrderIds;
    return Array.isArray(ids) && ids.length > 0 ? ids : [];
  });

  readonly countdownItems = computed(() => {
    const items = this.profileSignal().countdownItems;
    return Array.isArray(items) ? items : [];
  });

  constructor(private store: PluginStoreService) {}

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    const userId = this.getStoredUserId();
    this.store.get<UserProfile>(PLUGIN_ID, KEY, userId ?? undefined).subscribe({
      next: (p) => {
        const normalized = this.normalize(p);
        if (!normalized.id) {
          const withId = { ...normalized, id: generateUserId() };
          this.profileSignal.set(withId);
          this.persistUserId(withId.id);
          this.save(withId).subscribe();
        } else {
          this.profileSignal.set(normalized);
          this.persistUserId(normalized.id);
        }
      },
      error: () => {
        const savedId = this.getStoredUserId();
        if (savedId) {
          const newProfile = { ...DEFAULT_PROFILE, id: savedId };
          this.profileSignal.set(newProfile);
          this.save(newProfile).subscribe();
        }
      },
    });
  }

  /** Switch to another user (persists id and reloads profile). Call after disconnecting current user from external apps if desired. */
  switchUser(userId: string): void {
    this.persistUserId(userId);
    this.loaded = false;
    this.load();
  }

  private persistUserId(id: string | undefined): void {
    try {
      if (id) localStorage.setItem(USER_ID_STORAGE_KEY, id);
      else localStorage.removeItem(USER_ID_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  private getStoredUserId(): string | null {
    try {
      return localStorage.getItem(USER_ID_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  save(profile: UserProfile): Observable<UserProfile> {
    const normalized = this.normalize(profile);
    const userId = normalized.id ?? this.getStoredUserId();
    return this.store.put(PLUGIN_ID, KEY, normalized, userId ?? undefined).pipe(
      tap(() => this.profileSignal.set(normalized))
    );
  }

  /** Reload profile from store (e.g. after disconnecting an app from User management). */
  refreshProfile(): void {
    this.loaded = false;
    this.load();
  }

  updateProfile(profile: Partial<UserProfile>): void {
    this.save({ ...this.profileSignal(), ...profile }).subscribe({
      error: () => { /* persistence failed */ },
    });
  }

  addCountdown(item: Omit<CountdownItem, 'id'>): void {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `countdown-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const items = [...this.countdownItems(), { ...item, id }];
    this.updateProfile({ countdownItems: items });
  }

  removeCountdown(id: string): void {
    const items = this.countdownItems().filter((c) => c.id !== id);
    this.updateProfile({ countdownItems: items });
  }

  updateCountdown(id: string, patch: Partial<Omit<CountdownItem, 'id'>>): void {
    const items = this.countdownItems().map((c) =>
      c.id === id ? { ...c, ...patch } : c
    );
    this.updateProfile({ countdownItems: items });
  }

  private normalize(p: UserProfile | null | undefined): UserProfile {
    if (!p || typeof p !== 'object') return DEFAULT_PROFILE;
    const theme =
      p.theme === 'light' || p.theme === 'dark' || p.theme === 'classic' || p.theme === 'custom'
        ? p.theme
        : undefined;
    const customTheme = this.normalizeCustomTheme(p.customTheme);
    return {
      id: typeof p.id === 'string' && p.id.trim().length > 0 ? p.id.trim() : undefined,
      name: typeof p.name === 'string' ? p.name : DEFAULT_PROFILE.name,
      emoji: typeof p.emoji === 'string' ? p.emoji : DEFAULT_PROFILE.emoji,
      visiblePluginIds: Array.isArray(p.visiblePluginIds)
        ? p.visiblePluginIds.filter((id) => typeof id === 'string')
        : DEFAULT_PROFILE.visiblePluginIds,
      dashboardWidgetIds: Array.isArray(p.dashboardWidgetIds)
        ? p.dashboardWidgetIds.filter((id) => typeof id === 'string')
        : DEFAULT_PROFILE.dashboardWidgetIds,
      countdownItems: normalizeCountdownItems(p.countdownItems),
      theme,
      customTheme: Object.keys(customTheme).length > 0 ? customTheme : undefined,
      connectedApps: Array.isArray(p.connectedApps)
        ? p.connectedApps.filter((id) => typeof id === 'string')
        : DEFAULT_PROFILE.connectedApps,
      pluginOrderIds: Array.isArray(p.pluginOrderIds)
        ? p.pluginOrderIds.filter((id) => typeof id === 'string')
        : undefined,
    };
  }

  private static readonly HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

  private normalizeCustomTheme(
    ct: Partial<Record<CustomThemeKey, string>> | null | undefined
  ): Partial<Record<CustomThemeKey, string>> {
    if (!ct || typeof ct !== 'object') return {};
    const out: Partial<Record<CustomThemeKey, string>> = {};
    for (const key of CUSTOM_THEME_KEYS) {
      const v = ct[key];
      if (typeof v === 'string' && UserProfileService.HEX_COLOR.test(v.trim())) {
        out[key] = v.trim();
      }
    }
    return out;
  }
}
