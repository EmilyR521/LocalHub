import { Injectable, signal, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { PluginStoreService } from '../../../core/services/plugin-store.service';
import { UserProfileService } from '../../../core/services/user-profile.service';

const PLUGIN_ID = 'calendar';
const STORE_KEY = 'google-calendar';
const AUTH_URL_API = '/api/plugins/calendar/google/auth-url';
const DISCONNECT_API = '/api/plugins/calendar/google/disconnect';
const EVENTS_API = '/api/plugins/calendar/google/events';

export interface GoogleCalendarConnection {
  connected: boolean;
  email?: string;
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  start?: string;
  end?: string;
  htmlLink?: string;
  /** Google Calendar event colorId ("1"–"11"). */
  colorId?: string;
}

@Injectable({ providedIn: 'root' })
export class CalendarGoogleService {
  private http = inject(HttpClient);
  private store = inject(PluginStoreService);
  private userProfile = inject(UserProfileService);

  readonly connection = signal<GoogleCalendarConnection | null>(null);
  readonly authUrlError = signal<string | null>(null);
  private loaded = false;
  private loadRequested = signal(false);
  private previousUserId: string | undefined;

  constructor() {
    effect(() => {
      const id = this.userProfile.profile().id;
      if (id !== this.previousUserId) {
        this.previousUserId = id;
        this.connection.set(null);
        this.loaded = false;
      }
    });
    effect(() => {
      const id = this.userProfile.profile().id;
      const requested = this.loadRequested();
      if (id && requested && !this.loaded) {
        this.loaded = true;
        this.loadConnection(id);
      }
    });
  }

  load(): void {
    if (this.loaded) return;
    this.userProfile.load();
    this.loadRequested.set(true);
  }

  private loadConnection(userId: string): void {
    this.store.get<GoogleCalendarConnection>(PLUGIN_ID, STORE_KEY, userId).subscribe({
      next: (data) => this.connection.set(data ?? { connected: false }),
      error: () => this.connection.set({ connected: false }),
    });
  }

  getAuthUrl(): void {
    this.authUrlError.set(null);
    const userId = this.userProfile.profile().id;
    if (!userId) {
      this.authUrlError.set('Please sign in first (set your profile in User management).');
      return;
    }
    const headers = { 'X-User-Id': userId };
    this.http.get<{ url?: string; error?: string }>(AUTH_URL_API, { headers }).subscribe({
      next: (res) => {
        if (res.url) {
          window.location.href = res.url;
        } else {
          this.authUrlError.set(res.error ?? 'Google Calendar is not configured');
        }
      },
      error: () => this.authUrlError.set('Could not get sign-in URL'),
    });
  }

  disconnect(): void {
    const userId = this.userProfile.profile().id;
    if (!userId) return;
    const headers = { 'X-User-Id': userId };
    this.http.post(DISCONNECT_API, {}, { headers }).subscribe({
      next: () => this.connection.set({ connected: false }),
      error: () => this.connection.set({ connected: false }),
    });
  }

  getEvents(year: number, month: number): Observable<{ events: CalendarEvent[] }> {
    const userId = this.userProfile.profile().id;
    if (!userId) return of({ events: [] });
    const headers = { 'X-User-Id': userId };
    return this.http.get<{ events: CalendarEvent[] }>(EVENTS_API, {
      headers,
      params: { year, month },
    });
  }

  /** Call after redirect from OAuth callback to refresh connection state. */
  refreshConnection(): void {
    this.loaded = false;
    this.loadRequested.set(false);
    this.load();
  }
}
