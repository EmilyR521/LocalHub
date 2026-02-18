import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { StravaService, type StravaActivity } from '../services/strava.service';

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
    if (meters == null) return '—';
    const km = meters / 1000;
    return km >= 1 ? `${km.toFixed(1)} km` : `${meters} m`;
  }

  formatDuration(seconds?: number): string {
    if (seconds == null) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`;
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
