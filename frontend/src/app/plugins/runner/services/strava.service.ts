import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { UserProfileService } from '../../../core/services/user-profile.service';

const STRAVA_API = '/api/plugins/strava';

export interface StravaAthlete {
  username?: string;
  firstname?: string;
  lastname?: string;
  profile?: string;
}

export interface StravaConnection {
  connected: boolean;
  athlete?: StravaAthlete;
}

export interface StravaActivity {
  id: number;
  name: string;
  type?: string;
  sport_type?: string;
  start_date?: string;
  start_date_local?: string;
  distance?: number;
  moving_time?: number;
  elapsed_time?: number;
  total_elevation_gain?: number;
}

@Injectable({ providedIn: 'root' })
export class StravaService {
  private http = inject(HttpClient);
  private userProfile = inject(UserProfileService);

  readonly connection = signal<StravaConnection | null>(null);
  readonly connected = signal(false);
  readonly activities = signal<StravaActivity[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly authUrlError = signal<string | null>(null);

  private previousUserId: string | undefined;

  constructor() {
    effect(() => {
      const id = this.userProfile.profile().id;
      if (id !== this.previousUserId) {
        this.previousUserId = id;
        this.connection.set(null);
        this.connected.set(false);
        this.activities.set([]);
      }
    });
  }

  private headers(): { [key: string]: string } {
    const id = this.userProfile.profile().id;
    return id ? { 'X-User-Id': id } : {};
  }

  getAuthUrl(): Observable<{ url?: string; error?: string }> {
    return this.http.get<{ url?: string; error?: string }>(`${STRAVA_API}/auth-url`, {
      headers: this.headers(),
    });
  }

  checkConnection(): Observable<StravaConnection> {
    const id = this.userProfile.profile().id;
    if (!id) {
      this.connection.set(null);
      this.connected.set(false);
      return of({ connected: false });
    }
    return this.http.get<{ connected: boolean; athlete?: StravaAthlete }>(`${STRAVA_API}/connection`, {
      headers: this.headers(),
    }).pipe(
      tap((r) => {
        const conn: StravaConnection = { connected: !!r.connected, athlete: r.athlete };
        this.connection.set(conn);
        this.connected.set(conn.connected);
      }),
      catchError(() => {
        this.connection.set({ connected: false });
        this.connected.set(false);
        return of({ connected: false });
      })
    );
  }

  loadActivities(page = 1, perPage = 30): Observable<{ activities: StravaActivity[] }> {
    const id = this.userProfile.profile().id;
    if (!id) return of({ activities: [] });
    this.loading.set(true);
    this.error.set(null);
    return this.http
      .get<{ activities: StravaActivity[] }>(`${STRAVA_API}/activities`, {
        headers: this.headers(),
        params: { page: String(page), per_page: String(perPage) },
      })
      .pipe(
        tap((r) => {
          this.activities.set(r.activities ?? []);
          this.loading.set(false);
        }),
        catchError((err) => {
          this.loading.set(false);
          const code = err?.error?.code;
          const msg = err?.error?.error ?? err?.message ?? 'Failed to load activities';
          this.error.set(msg);
          if (code === 'strava_not_connected') this.connected.set(false);
          return of({ activities: [] });
        })
      );
  }

  disconnect(): Observable<{ ok?: boolean }> {
    const id = this.userProfile.profile().id;
    if (!id) return of({});
    return this.http.post<{ ok?: boolean }>(`${STRAVA_API}/disconnect`, {}, { headers: this.headers() }).pipe(
      tap(() => {
        this.connection.set({ connected: false });
        this.connected.set(false);
        this.activities.set([]);
      })
    );
  }

  /** Open Strava OAuth in current window (call from settings). */
  connectToStrava(): void {
    this.authUrlError.set(null);
    const id = this.userProfile.profile().id;
    if (!id) {
      this.authUrlError.set('Set your profile in User management first.');
      return;
    }
    this.http.get<{ url?: string; error?: string }>(`${STRAVA_API}/auth-url`, { headers: this.headers() }).subscribe({
      next: (res) => {
        if (res.url) window.location.href = res.url;
        else this.authUrlError.set(res.error ?? 'Strava is not configured.');
      },
      error: (err: HttpErrorResponse) => {
        const body = err.error as { error?: string } | null;
        const msg = body?.error ?? err.message ?? 'Could not get Strava authorization URL.';
        this.authUrlError.set(msg);
      },
    });
  }

  /** Call after redirect from OAuth to refresh connection state. */
  refreshConnection(): void {
    this.checkConnection().subscribe();
  }
}
