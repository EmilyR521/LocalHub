import { Component, OnInit, inject, signal, computed, effect, ElementRef } from '@angular/core';
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

  /** Backup: which plugins to include (set of plugin ids). */
  readonly backupPluginIds = signal<Set<string>>(new Set());
  readonly backupStatus = signal<'idle' | 'downloading' | 'error'>('idle');
  /** Restore result message. */
  readonly restoreStatus = signal<'idle' | 'uploading' | 'success' | 'error'>('idle');
  readonly restoreMessage = signal('');
  /** Plugin IDs that have data (for backup selection). Filled on load. */
  readonly backupAvailablePluginIds = signal<string[]>([]);

  private defaultPluginOrder = [...PLUGINS]
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .map((p) => p.id);

  readonly plugins = computed(() =>
    [...PLUGINS].sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  );

  /** Plugin IDs in display order (sidebar order). Edited by user and saved as pluginOrderIds. */
  readonly orderedPluginIds = signal<string[]>([]);

  readonly connectedApps = computed(() => this.userProfile.connectedApps());

  constructor() {
    effect(() => this.applyProfile(this.userProfile.profile()));
  }

  ngOnInit(): void {
    this.userProfile.load();
    this.loadBackupPlugins();
  }

  private loadBackupPlugins(): void {
    const userId = this.userProfile.profile()?.id;
    if (!userId) return;
    this.http
      .get<{ pluginIds: string[] }>('/api/plugins/user-management/backup/plugins', {
        headers: { 'X-User-Id': userId },
      })
      .subscribe({
        next: (res) => {
          const ids = res.pluginIds ?? [];
          this.backupAvailablePluginIds.set(ids);
          if (ids.length > 0 && this.backupPluginIds().size === 0) this.backupPluginIds.set(new Set(ids));
        },
        error: () => this.backupAvailablePluginIds.set([]),
      });
  }

  private applyProfile(p: UserProfile | null): void {
    const profile = p && typeof p === 'object'
      ? {
          name: typeof p.name === 'string' ? p.name : '',
          emoji: typeof p.emoji === 'string' ? p.emoji : '👤',
          theme: (p.theme === 'light' || p.theme === 'dark' || p.theme === 'classic' ? p.theme : 'dark') as ThemeMode,
          visiblePluginIds: Array.isArray(p.visiblePluginIds) ? p.visiblePluginIds : [],
          pluginOrderIds: Array.isArray(p.pluginOrderIds) ? p.pluginOrderIds : [],
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
    const knownIds = new Set(PLUGINS.map((x) => x.id));
    const savedOrder = Array.isArray(p?.pluginOrderIds) ? p.pluginOrderIds : [];
    const validOrder =
      Array.isArray(savedOrder) &&
      savedOrder.length > 0 &&
      savedOrder.every((id) => knownIds.has(id));
    const baseOrder = validOrder
      ? savedOrder.filter((id) => knownIds.has(id))
      : [...this.defaultPluginOrder];
    // Append any plugin IDs from registry not yet in the list (e.g. newly added plugins like Gardener)
    const inBase = new Set(baseOrder);
    const appended = this.defaultPluginOrder.filter((id) => !inBase.has(id));
    this.orderedPluginIds.set([...baseOrder, ...appended]);
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

  movePlugin(index: number, direction: 1 | -1): void {
    const list = [...this.orderedPluginIds()];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= list.length) return;
    [list[index], list[newIndex]] = [list[newIndex], list[index]];
    this.orderedPluginIds.set(list);
  }

  getPluginById(id: string): { id: string; name: string; icon?: string } | undefined {
    return PLUGINS.find((p) => p.id === id);
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
      pluginOrderIds: this.orderedPluginIds().length > 0 ? [...this.orderedPluginIds()] : undefined,
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

  isBackupPluginSelected(pluginId: string): boolean {
    return this.backupPluginIds().has(pluginId);
  }

  toggleBackupPlugin(pluginId: string): void {
    const next = new Set(this.backupPluginIds());
    if (next.has(pluginId)) next.delete(pluginId);
    else next.add(pluginId);
    this.backupPluginIds.set(next);
  }

  selectAllBackup(): void {
    const ids = this.backupAvailablePluginIds().length > 0
      ? this.backupAvailablePluginIds()
      : this.plugins().map((p) => p.id);
    this.backupPluginIds.set(new Set(ids));
  }

  selectNoneBackup(): void {
    this.backupPluginIds.set(new Set());
  }

  downloadBackup(): void {
    const userId = this.userProfile.profile()?.id;
    if (!userId) return;
    this.backupStatus.set('downloading');
    const selected = this.backupPluginIds();
    const pluginIds = selected.size === 0 || selected.size >= this.plugins().length
      ? ['all']
      : Array.from(selected);
    this.http
      .post('/api/plugins/user-management/backup', { pluginIds }, {
        headers: { 'X-User-Id': userId },
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `localhub-backup-${new Date().toISOString().slice(0, 10)}.zip`;
          a.click();
          URL.revokeObjectURL(url);
          this.backupStatus.set('idle');
        },
        error: () => this.backupStatus.set('error'),
      });
  }

  onRestoreFile(inputRef: ElementRef<HTMLInputElement> | HTMLInputElement): void {
    const input = inputRef && 'nativeElement' in inputRef ? inputRef.nativeElement : inputRef;
    const file = input.files?.[0];
    if (!file) return;
    const userId = this.userProfile.profile()?.id;
    if (!userId) return;
    this.restoreStatus.set('uploading');
    this.restoreMessage.set('');
    const formData = new FormData();
    formData.append('file', file);
    this.http
      .post<{ restored: number; errors?: string[] }>('/api/plugins/user-management/restore', formData, {
        headers: { 'X-User-Id': userId },
      })
      .subscribe({
        next: (res) => {
          this.restoreStatus.set('success');
          const msg = res.errors?.length
            ? `Restored ${res.restored} file(s). Some issues: ${res.errors.slice(0, 3).join('; ')}`
            : `Restored ${res.restored} file(s).`;
          this.restoreMessage.set(msg);
          this.userProfile.refreshProfile();
          input.value = '';
        },
        error: (err) => {
          this.restoreStatus.set('error');
          this.restoreMessage.set(err?.error?.error ?? err?.message ?? 'Restore failed');
          input.value = '';
        },
      });
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
