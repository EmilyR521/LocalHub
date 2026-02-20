import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UserProfileService, UserProfile, type ThemeMode } from '../../../core/services/user-profile.service';
import { PLUGINS } from '../../plugin-registry';
import { EmojiGridComponent } from '../../../shared/components/emoji-grid/emoji-grid.component';

/** Display names for connected app IDs. */
const CONNECTED_APP_LABELS: Record<string, string> = {
  calendar: 'Google Calendar',
  strava: 'Strava',
};

const DEFAULT_PROFILE = {
  name: '',
  emoji: '👤',
  theme: 'dark' as ThemeMode,
  visiblePluginIds: [] as string[],
};

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [FormsModule, EmojiGridComponent],
  templateUrl: './my-profile.component.html',
})
export class MyProfileComponent implements OnInit {
  private http = inject(HttpClient);
  private userProfile = inject(UserProfileService);

  readonly name = signal('');
  readonly emoji = signal('👤');
  readonly theme = signal<ThemeMode>('dark');
  readonly selectedPluginIds = signal<Set<string>>(new Set());
  readonly saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  readonly disconnectingAppId = signal<string | null>(null);

  readonly plugins = computed(() =>
    [...PLUGINS].sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  );
  readonly connectedApps = computed(() => this.userProfile.connectedApps());

  constructor() {
    effect(() => this.applyProfile(this.userProfile.profile()));
  }

  ngOnInit(): void {
    this.userProfile.load();
  }

  private applyProfile(p: UserProfile | null): void {
    const profile = p && typeof p === 'object'
      ? {
          name: typeof p.name === 'string' ? p.name : '',
          emoji: typeof p.emoji === 'string' ? p.emoji : '👤',
          theme: (p.theme === 'light' || p.theme === 'dark' ? p.theme : 'dark') as ThemeMode,
          visiblePluginIds: Array.isArray(p.visiblePluginIds) ? p.visiblePluginIds : [],
        }
      : DEFAULT_PROFILE;
    this.name.set(profile.name);
    this.emoji.set(profile.emoji);
    this.theme.set(profile.theme);
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

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
    this.userProfile.updateProfile({ theme: mode });
  }

  save(): void {
    this.saveStatus.set('saving');
    const current = this.userProfile.profile();
    const profile: UserProfile = {
      ...(current?.id && { id: current.id }),
      name: this.name().trim(),
      emoji: this.emoji().trim() || '👤',
      visiblePluginIds: [...this.selectedPluginIds()],
      theme: this.theme(),
      ...(Array.isArray(current?.dashboardWidgetIds) && {
        dashboardWidgetIds: current.dashboardWidgetIds,
      }),
      ...(Array.isArray(current?.connectedApps) && { connectedApps: current.connectedApps }),
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
    const userId = this.userProfile.profile()?.id;
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
