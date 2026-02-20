import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PLUGINS } from '../plugins/plugin-registry';
import { UserProfileService } from '../core/services/user-profile.service';

const SIDEBAR_COLLAPSED_KEY = 'localhub-sidebar-collapsed';

@Component({
  selector: 'app-hub',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './hub.component.html',
})
export class HubComponent implements OnInit {
  private allPlugins = signal(
    [...PLUGINS].sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  );

  readonly sidebarCollapsed = signal(false);

  readonly plugins = computed(() => {
    const visible = this.userProfile.visiblePluginIds();
    const all = this.allPlugins();
    if (visible.length === 0) return all;
    const set = new Set(visible);
    return all.filter((p) => set.has(p.id));
  });

  readonly userName = this.userProfile.name;
  readonly userEmoji = this.userProfile.emoji;

  constructor(readonly userProfile: UserProfileService) {}

  ngOnInit(): void {
    this.userProfile.load();
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored !== null) this.sidebarCollapsed.set(stored === 'true');
    } catch {
      // ignore
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((c) => !c);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(this.sidebarCollapsed()));
    } catch {
      // ignore
    }
  }
}
