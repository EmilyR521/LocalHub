import { Component, inject, signal, computed, effect } from '@angular/core';
import { CalendarGoogleService, type CalendarEvent } from '../../services/calendar-google.service';

/** British standard: week starts on Monday */
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface DayCell {
  date: Date;
  isCurrentMonth: boolean;
  dayOfMonth: number;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-calendar-month-view',
  standalone: true,
  templateUrl: './calendar-month-view.component.html',
})
export class CalendarMonthViewComponent {
  private calendarGoogle = inject(CalendarGoogleService);

  readonly viewYear = signal(new Date().getFullYear());
  readonly viewMonth = signal(new Date().getMonth() + 1);
  readonly events = signal<CalendarEvent[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly monthLabel = computed(() => {
    const d = new Date(this.viewYear(), this.viewMonth() - 1, 1);
    return d.toLocaleDateString('default', { month: 'long', year: 'numeric' });
  });

  readonly dayNames = DAY_NAMES;

  /** Grid with Monday as first column (British standard). */
  readonly grid = computed(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    const startDay = first.getDay();
    const leading = (startDay + 6) % 7;
    const daysInMonth = last.getDate();
    const eventsByDay = this.eventsByDay();
    const cells: DayCell[] = [];
    for (let i = 0; i < leading; i++) {
      const d = new Date(year, month - 1, 1 - leading + i);
      cells.push({
        date: d,
        isCurrentMonth: false,
        dayOfMonth: d.getDate(),
        events: eventsByDay.get(d.toISOString().slice(0, 10)) ?? [],
      });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month - 1, day);
      const key = d.toISOString().slice(0, 10);
      cells.push({
        date: d,
        isCurrentMonth: true,
        dayOfMonth: day,
        events: eventsByDay.get(key) ?? [],
      });
    }
    const remaining = 42 - cells.length;
    for (let i = 0; i < remaining; i++) {
      const d = new Date(year, month, i + 1);
      cells.push({
        date: d,
        isCurrentMonth: false,
        dayOfMonth: d.getDate(),
        events: eventsByDay.get(d.toISOString().slice(0, 10)) ?? [],
      });
    }
    return cells;
  });

  readonly rows = computed(() => {
    const cells = this.grid();
    const result: DayCell[][] = [];
    for (let r = 0; r < 6; r++) {
      result.push(cells.slice(r * 7, (r + 1) * 7));
    }
    return result;
  });

  private eventsByDay = computed(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of this.events()) {
      const dateKey = e.start?.slice(0, 10);
      if (!dateKey) continue;
      const list = map.get(dateKey) ?? [];
      list.push(e);
      map.set(dateKey, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''));
    }
    return map;
  });

  constructor() {
    effect(() => {
      const conn = this.calendarGoogle.connection();
      const y = this.viewYear();
      const m = this.viewMonth();
      if (conn?.connected) this.fetchEvents(y, m);
    });
  }

  private fetchEvents(year: number, month: number): void {
    this.loadError.set(null);
    this.loading.set(true);
    this.calendarGoogle.getEvents(year, month).subscribe({
      next: (res) => {
        this.events.set(res.events ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        const status = err?.status ?? err?.statusCode;
        const body = err?.error;
        const code = body?.code ?? body?.error;
        if (status === 401 || status === 403 || code === 'calendar_not_connected') {
          this.loadError.set(
            'Google Calendar connection is missing or expired. Open Calendar settings (⚙️) and disconnect, then connect again.'
          );
        } else {
          this.loadError.set('Could not load events. Try again or reconnect in settings.');
        }
        this.events.set([]);
        this.loading.set(false);
      },
    });
  }

  prevMonth(): void {
    const m = this.viewMonth();
    const y = this.viewYear();
    if (m === 1) {
      this.viewYear.set(y - 1);
      this.viewMonth.set(12);
    } else {
      this.viewMonth.set(m - 1);
    }
  }

  nextMonth(): void {
    const m = this.viewMonth();
    const y = this.viewYear();
    if (m === 12) {
      this.viewYear.set(y + 1);
      this.viewMonth.set(1);
    } else {
      this.viewMonth.set(m + 1);
    }
  }

  eventTimeLabel(event: CalendarEvent): string {
    if (!event.start) return '';
    if (event.start.length <= 10) return 'All day';
    const t = event.start.slice(11, 16);
    return t ? t : '';
  }
}
