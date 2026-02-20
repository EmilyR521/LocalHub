import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SettingsDrawerHostComponent } from '../../shared/components/settings-drawer-host/settings-drawer-host.component';
import { CalendarMonthViewComponent } from './components/calendar-month-view/calendar-month-view.component';
import { CalendarSettingsComponent } from './components/calendar-settings/calendar-settings.component';
import { CalendarDisplayService } from './services/calendar-display.service';
import { CalendarGoogleService } from './services/calendar-google.service';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_callback: 'Invalid sign-in response. Please try again.',
  not_configured: 'Google Calendar is not configured on the server.',
  token_failed: 'Sign-in failed. Please try again.',
  save_failed: 'Could not save connection. Please try again.',
};

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [SettingsDrawerHostComponent, CalendarMonthViewComponent, CalendarSettingsComponent],
  templateUrl: './calendar.component.html',
})
export class CalendarComponent implements OnInit {
  private route = inject(ActivatedRoute);
  readonly calendarGoogle = inject(CalendarGoogleService);
  readonly displayOptions = inject(CalendarDisplayService);
  readonly oauthError = signal<string | null>(null);

  /** Show month view when Google not connected but habits or reading are enabled. */
  readonly displayShowCalendarWithoutGoogle = () =>
    this.displayOptions.displayHabits() || this.displayOptions.displayReading();

  ngOnInit(): void {
    this.calendarGoogle.load();
    this.displayOptions.load();
    this.route.queryParams.subscribe((params) => {
      if (params['connected'] === '1') this.calendarGoogle.refreshConnection();
      const err = params['error'];
      if (typeof err === 'string') this.oauthError.set(OAUTH_ERROR_MESSAGES[err] ?? 'Connection failed.');
    });
  }
}
