import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatMonDayMonth, daysAgoLabel as formatDaysAgo } from '../../../core/utils/date-format';
import { StravaService, type StravaActivity } from '../../../plugins/runner/services/strava.service';
import { formatDistance as formatDist, formatDuration as formatDur } from '../../../plugins/runner/utils/activity-format';

@Component({
  selector: 'app-dashboard-last-run-widget',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-last-run-widget.component.html',
})
export class DashboardLastRunWidgetComponent implements OnInit {
  private strava = inject(StravaService);

  readonly connected = this.strava.connected.asReadonly();
  readonly lastRun = computed(() => {
    const activities = this.strava.activities();
    return activities.length > 0 ? activities[0] : null;
  });

  ngOnInit(): void {
    this.strava.checkConnection().subscribe((r) => {
      if (r.connected) this.strava.loadActivities(1, 5).subscribe();
    });
  }

  formatDate(activity: StravaActivity): string {
    const iso = activity.start_date_local ?? activity.start_date;
    if (!iso) return '—';
    try {
      return formatMonDayMonth(new Date(iso));
    } catch {
      return iso;
    }
  }

  daysAgoLabel(activity: StravaActivity): string {
    const iso = activity.start_date_local ?? activity.start_date;
    if (!iso) return '';
    try {
      return formatDaysAgo(new Date(iso));
    } catch {
      return '';
    }
  }

  formatDistance(activity: StravaActivity): string {
    return formatDist(activity.distance);
  }

  formatDuration(activity: StravaActivity): string {
    return formatDur(activity.moving_time ?? activity.elapsed_time);
  }
}
