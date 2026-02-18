import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserProfileService, UserProfile, type ThemeMode } from '../../core/services/user-profile.service';
import { PLUGINS } from '../plugin-registry';

const EMOJI_PRESETS = ['👤', '🏠', '⚙️', '🔧', '🌟', '🎯'];
const USERS_API = '/api/plugins/user-management/users';
const CALENDAR_DISCONNECT = '/api/plugins/calendar/google/disconnect';
const STRAVA_DISCONNECT = '/api/plugins/strava/disconnect';

/** Display names for connected app IDs (external API authorisation). */
const CONNECTED_APP_LABELS: Record<string, string> = {
  calendar: 'Google Calendar',
  strava: 'Strava',
};

export interface UserListItem {
  id: string;
  name: string;
  emoji: string;
}

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  emoji: '👤',
  visiblePluginIds: [],
};

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './user-management.component.html',
})
export class UserManagementComponent implements OnInit {
  private http = inject(HttpClient);
  private userProfile = inject(UserProfileService);

  readonly name = signal('');
  readonly emoji = signal('👤');
  readonly theme = signal<ThemeMode>('dark');
  readonly selectedPluginIds = signal<Set<string>>(new Set());
  readonly saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  readonly disconnectingAppId = signal<string | null>(null);
  readonly usersList = signal<UserListItem[]>([]);
  readonly switchingUser = signal(false);

  readonly currentUserId = computed(() => this.userProfile.profile()?.id ?? null);
  readonly usersForSelect = computed(() => {
    const list = this.usersList();
    const current = this.userProfile.profile();
    const id = current?.id;
    if (!id) return list;
    if (list.some((u) => u.id === id)) return list;
    return [
      ...list,
      {
        id,
        name: (current?.name && current.name.trim()) || 'New user',
        emoji: current?.emoji || '👤',
      },
    ];
  });

  readonly plugins = computed(() =>
    [...PLUGINS].sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  );
  readonly connectedApps = computed(() => this.userProfile.connectedApps());

  readonly emojiPresets = EMOJI_PRESETS;

  constructor() {
    effect(() => this.applyProfile(this.userProfile.profile()));
  }

  ngOnInit(): void {
    this.userProfile.load();
    this.loadUsers();
  }

  loadUsers(): void {
    this.http.get<{ users: UserListItem[] }>(USERS_API).subscribe({
      next: (res) => this.usersList.set(res.users ?? []),
      error: () => this.usersList.set([]),
    });
  }

  onUserSelect(userId: string): void {
    const currentId = this.currentUserId();
    if (userId === currentId || !userId) return;
    if (!currentId) {
      this.doSwitchUser(userId);
      return;
    }
    this.switchingUser.set(true);
    this.disconnectUserFromExternalApps(currentId).subscribe({
      next: () => this.doSwitchUser(userId),
      error: () => this.doSwitchUser(userId),
      complete: () => this.switchingUser.set(false),
    });
  }

  private disconnectUserFromExternalApps(userId: string | null) {
    if (!userId) return forkJoin([]);
    const headers = { 'X-User-Id': userId };
    return forkJoin({
      calendar: this.http.post(CALENDAR_DISCONNECT, {}, { headers }).pipe(catchError(() => of(null))),
      strava: this.http.post(STRAVA_DISCONNECT, {}, { headers }).pipe(catchError(() => of(null))),
    });
  }

  private doSwitchUser(userId: string): void {
    this.userProfile.switchUser(userId);
    this.loadUsers();
  }

  addUser(): void {
    const newId = UserProfileService.generateUserId();
    this.userProfile.switchUser(newId);
    this.loadUsers();
  }

  private applyProfile(p: UserProfile | null): void {
    const profile = p && typeof p === 'object'
      ? {
          name: typeof p.name === 'string' ? p.name : '',
          emoji: typeof p.emoji === 'string' ? p.emoji : '👤',
          theme: p.theme === 'light' || p.theme === 'dark' ? p.theme : ('dark' as ThemeMode),
          visiblePluginIds: Array.isArray(p.visiblePluginIds) ? p.visiblePluginIds : [],
          connectedApps: Array.isArray(p.connectedApps) ? p.connectedApps : [],
        }
      : { ...DEFAULT_PROFILE, connectedApps: [] };
    this.name.set(profile.name);
    this.emoji.set(profile.emoji);
    this.theme.set(profile.theme ?? 'dark');
    this.selectedPluginIds.set(
      profile.visiblePluginIds.length > 0
        ? new Set(profile.visiblePluginIds)
        : new Set(PLUGINS.map((x) => x.id))
    );
  }

  isSelected(pluginId: string): boolean {
    return this.selectedPluginIds().has(pluginId);
  }

  togglePlugin(pluginId: string): void {
    const next = new Set(this.selectedPluginIds());
    if (next.has(pluginId)) next.delete(pluginId);
    else next.add(pluginId);
    this.selectedPluginIds.set(next);
  }

  selectAll(): void {
    this.selectedPluginIds.set(new Set(PLUGINS.map((p) => p.id)));
  }

  selectNone(): void {
    this.selectedPluginIds.set(new Set());
  }

  setEmojiPreset(emoji: string): void {
    this.emoji.set(emoji);
  }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
    this.userProfile.updateProfile({ theme: mode });
  }

  save(): void {
    this.saveStatus.set('saving');
    const current = this.userProfile.profile();
    const profile: UserProfile = {
      ...(current.id && { id: current.id }),
      name: this.name().trim(),
      emoji: this.emoji().trim() || '👤',
      visiblePluginIds: [...this.selectedPluginIds()],
      theme: this.theme(),
      ...(Array.isArray(current.dashboardWidgetIds) && {
        dashboardWidgetIds: current.dashboardWidgetIds,
      }),
      ...(Array.isArray(current.connectedApps) && { connectedApps: current.connectedApps }),
    };
    this.userProfile.save(profile).subscribe({
      next: () => {
        this.saveStatus.set('saved');
        setTimeout(() => this.saveStatus.set('idle'), 2000);
      },
      error: () => this.saveStatus.set('error'),
    });
  }

  getConnectedAppLabel(appId: string): string {
    return CONNECTED_APP_LABELS[appId] ?? appId;
  }

  disconnectApp(appId: string): void {
    const userId = this.userProfile.profile().id;
    if (!userId) return;
    const headers = { 'X-User-Id': userId };
    const endpoints: Record<string, string> = {
      calendar: '/api/plugins/calendar/google/disconnect',
      strava: '/api/plugins/strava/disconnect',
    };
    const url = endpoints[appId];
    if (!url) return;
    this.disconnectingAppId.set(appId);
    this.http.post(url, {}, { headers }).subscribe({
      next: () => this.userProfile.refreshProfile(),
      error: () => this.userProfile.refreshProfile(),
      complete: () => this.disconnectingAppId.set(null),
    });
  }
}
