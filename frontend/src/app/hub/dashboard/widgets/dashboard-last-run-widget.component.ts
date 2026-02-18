import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StravaService, type StravaActivity } from '../../../plugins/runner/services/strava.service';

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
      return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
    } catch {
      return iso;
    }
  }

  formatDistance(activity: StravaActivity): string {
    const m = activity.distance;
    if (m == null) return '—';
    const km = m / 1000;
    return km >= 1 ? `${km.toFixed(1)} km` : `${m} m`;
  }

  formatDuration(activity: StravaActivity): string {
    const seconds = activity.moving_time ?? activity.elapsed_time;
    if (seconds == null) return '—';
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return sec > 0 ? `${min}:${String(sec).padStart(2, '0')}` : `${min} min`;
  }
}
