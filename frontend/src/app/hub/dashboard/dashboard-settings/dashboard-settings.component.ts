import { Component, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { DASHBOARD_WIDGETS } from '../dashboard-widgets.registry';

@Component({
  selector: 'app-dashboard-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './dashboard-settings.component.html',
})
export class DashboardSettingsComponent {
  private userProfile = inject(UserProfileService);

  readonly widgets = DASHBOARD_WIDGETS;
  readonly selectedIds = computed(() => new Set(this.userProfile.dashboardWidgetIds()));
  readonly countdownItems = this.userProfile.countdownItems;

  /** Form state for adding a new countdown */
  readonly newCountdownTitle = signal('');
  readonly newCountdownEmoji = signal('📅');
  readonly newCountdownDate = signal('');

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggle(widgetId: string): void {
    const ids = this.userProfile.dashboardWidgetIds();
    const next = new Set(ids);
    if (next.has(widgetId)) next.delete(widgetId);
    else next.add(widgetId);
    this.userProfile.updateProfile({ dashboardWidgetIds: Array.from(next) });
  }

  addCountdown(): void {
    const title = this.newCountdownTitle().trim();
    const eventDate = this.newCountdownDate().trim();
    if (!title || !eventDate) return;
    this.userProfile.addCountdown({
      title,
      emoji: this.newCountdownEmoji().trim() || '📅',
      eventDate,
    });
    this.newCountdownTitle.set('');
    this.newCountdownEmoji.set('📅');
    this.newCountdownDate.set('');
  }

  removeCountdown(id: string): void {
    this.userProfile.removeCountdown(id);
  }
}
