import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CalendarMonthViewComponent } from '../../../../plugins/calendar/components/calendar-month-view/calendar-month-view.component';
import { CalendarDisplayService } from '../../../../plugins/calendar/services/calendar-display.service';
import { CalendarGoogleService } from '../../../../plugins/calendar/services/calendar-google.service';

@Component({
  selector: 'app-dashboard-calendar-widget',
  standalone: true,
  imports: [RouterLink, CalendarMonthViewComponent],
  templateUrl: './dashboard-calendar-widget.component.html',
})
export class DashboardCalendarWidgetComponent implements OnInit {
  private calendarGoogle = inject(CalendarGoogleService);
  private displayOptions = inject(CalendarDisplayService);

  readonly calendarGoogleConnection = this.calendarGoogle.connection;
  readonly displayShowCalendarWithoutGoogle = () =>
    this.displayOptions.displayHabits() || this.displayOptions.displayReading();

  ngOnInit(): void {
    this.calendarGoogle.load();
    this.displayOptions.load();
  }
}
