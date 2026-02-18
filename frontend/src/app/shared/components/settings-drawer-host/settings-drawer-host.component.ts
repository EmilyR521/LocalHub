import { Component, input, signal } from '@angular/core';

/**
 * Reusable layout for plugin apps that support settings:
 * - Optional toolbar with title and a cog button in the top right
 * - Main content area (projected)
 * - Right-hand settings drawer opened by the cog; content is projected
 *
 * Usage in any plugin:
 *   <app-settings-drawer-host [title]="'My Plugin'">
 *     <ng-container main>
 *       ... main plugin content ...
 *     </ng-container>
 *     <ng-container settings>
 *       ... plugin-specific settings form ...
 *     </ng-container>
 *   </app-settings-drawer-host>
 */
@Component({
  selector: 'app-settings-drawer-host',
  standalone: true,
  templateUrl: './settings-drawer-host.component.html',
})
export class SettingsDrawerHostComponent {
  /** Optional label shown in the toolbar (e.g. plugin name). */
  title = input<string>('');
  /** Optional subtitle shown under the title. */
  subtitle = input<string>('');

  /** Whether the settings drawer is open. */
  drawerOpen = signal(false);

  openDrawer(): void {
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }
}
