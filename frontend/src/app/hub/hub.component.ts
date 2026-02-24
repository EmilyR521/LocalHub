import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PLUGINS, type PluginManifest } from '../plugins/plugin-registry';
import { UserProfileService } from '../core/services/user-profile.service';

const SIDEBAR_COLLAPSED_KEY = 'localhub-sidebar-collapsed';

const DEFAULT_ORDERED = [...PLUGINS].sort(
  (a, b) => (a.order ?? 99) - (b.order ?? 99)
);

@Component({
  selector: 'app-hub',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './hub.component.html',
})
export class HubComponent implements OnInit {
  readonly sidebarCollapsed = signal(false);

  readonly plugins = computed(() => {
    const visible = this.userProfile.visiblePluginIds();
    const orderIds = this.userProfile.pluginOrderIds();
    let all: PluginManifest[];
    if (orderIds.length > 0) {
      const orderMap = new Map(orderIds.map((id, i) => [id, i]));
      all = [...PLUGINS].sort((a, b) => {
        const ai = orderMap.get(a.id) ?? 9999;
        const bi = orderMap.get(b.id) ?? 9999;
        if (ai !== bi) return ai - bi;
        return (a.order ?? 99) - (b.order ?? 99);
      });
    } else {
      all = DEFAULT_ORDERED;
    }
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
