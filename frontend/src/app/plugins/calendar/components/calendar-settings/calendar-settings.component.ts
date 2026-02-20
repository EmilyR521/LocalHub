import { Component, OnInit, inject } from '@angular/core';
import { CalendarGoogleService } from '../../services/calendar-google.service';
import { CalendarDisplayService } from '../../services/calendar-display.service';

@Component({
  selector: 'app-calendar-settings',
  standalone: true,
  templateUrl: './calendar-settings.component.html',
})
export class CalendarSettingsComponent implements OnInit {
  readonly calendarGoogle = inject(CalendarGoogleService);
  readonly displayOptions = inject(CalendarDisplayService);

  /** Fallback for the colour picker when no custom theme is set (matches default --accent). */
  readonly defaultThemeHex = '#58a6ff';

  ngOnInit(): void {
    this.displayOptions.load();
  }

  onThemeColorInput(e: Event): void {
    const value = (e.target as HTMLInputElement).value;
    this.displayOptions.setThemeColor(value);
  }
}
