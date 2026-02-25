import { Component, inject } from '@angular/core';
import { UserProfileService } from '../../../../core/services/user-profile.service';
import { daysFromToday } from '../../../../core/utils/date-format';
import type { CountdownItem } from '../../../../core/services/user-profile.service';

@Component({
  selector: 'app-dashboard-countdown-widget',
  standalone: true,
  imports: [],
  templateUrl: './dashboard-countdown-widget.component.html',
})
export class DashboardCountdownWidgetComponent {
  private userProfile = inject(UserProfileService);

  readonly countdowns = this.userProfile.countdownItems;

  /** e.g. "5 days until Holiday" or "Today: Holiday" or "Holiday was 2 days ago" */
  countdownLabel(item: CountdownItem): string {
    const days = daysFromToday(item.eventDate);
    if (days > 0) {
      const dayWord = days === 1 ? 'day' : 'days';
      return `${days} ${dayWord} until ${item.title}`;
    }
    if (days === 0) return `Today: ${item.title}`;
    const ago = -days;
    const dayWord = ago === 1 ? 'day' : 'days';
    return `${item.title} was ${ago} ${dayWord} ago`;
  }
}
