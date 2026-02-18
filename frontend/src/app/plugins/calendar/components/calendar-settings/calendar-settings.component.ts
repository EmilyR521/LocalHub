import { Component, inject } from '@angular/core';
import { CalendarGoogleService } from '../../services/calendar-google.service';

@Component({
  selector: 'app-calendar-settings',
  standalone: true,
  templateUrl: './calendar-settings.component.html',
})
export class CalendarSettingsComponent {
  readonly calendarGoogle = inject(CalendarGoogleService);
}
