import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserProfileService } from '../../../../core/services/user-profile.service';
import { StravaService, type StravaActivity } from '../../services/strava.service';
import { formatDistance as formatDist, formatDuration as formatDur } from '../../utils/activity-format';

@Component({
  selector: 'app-recent-runs',
  standalone: true,
  templateUrl: './recent-runs.component.html',
})
export class RecentRunsComponent implements OnInit {
  private strava = inject(StravaService);
  private userProfile = inject(UserProfileService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly connected = this.strava.connected.asReadonly();
  readonly activities = this.strava.activities.asReadonly();
  readonly loading = this.strava.loading.asReadonly();
  readonly stravaError = this.strava.error.asReadonly();

  /** Activities from the current year only. */
  readonly currentYearActivities = computed(() => {
    const year = new Date().getFullYear();
    return this.activities().filter((a: StravaActivity) => {
      const iso = a.start_date_local ?? a.start_date;
      if (!iso || iso.length < 4) return false;
      return parseInt(iso.slice(0, 4), 10) === year;
    });
  });

  readonly currentYear = new Date().getFullYear();
  readonly queryMessage = signal<string | null>(null);
  readonly queryIsError = signal(false);

  ngOnInit(): void {
    this.userProfile.load();
    this.strava.checkConnection().subscribe((r) => {
      if (r.connected) this.strava.loadActivities(1, 30).subscribe();
    });
    this.route.queryParams.subscribe((params) => {
      const strava = params['strava'];
      const message = params['message'];
      if (strava === 'connected') {
        this.queryIsError.set(false);
        this.queryMessage.set('Strava connected. Loading your activities.');
        this.strava.refreshConnection();
        this.strava.loadActivities(1, 30).subscribe();
        this.router.navigate([], { relativeTo: this.route, queryParams: {}, queryParamsHandling: '' });
      } else if (strava === 'error') {
        this.queryIsError.set(true);
        const msg = message === 'invalid_callback' ? 'Invalid callback from Strava.'
          : message === 'not_configured' ? 'Strava is not configured on the server.'
          : message === 'token_failed' ? 'Could not complete Strava authorization.'
          : message === 'save_failed' ? 'Could not save connection.'
          : 'Something went wrong. Try again.';
        this.queryMessage.set(msg);
        this.router.navigate([], { relativeTo: this.route, queryParams: {}, queryParamsHandling: '' });
      }
    });
  }

  loadActivities(): void {
    this.strava.loadActivities(1, 30).subscribe();
  }

  formatDistance(meters?: number): string {
    return formatDist(meters);
  }

  formatDuration(seconds?: number): string {
    return formatDur(seconds);
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
    } catch {
      return iso;
    }
  }
}
