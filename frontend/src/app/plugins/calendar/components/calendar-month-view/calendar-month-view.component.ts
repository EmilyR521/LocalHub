import { NgStyle } from '@angular/common';
import { Component, inject, signal, computed, effect } from '@angular/core';
import { HabitsService } from '../../../habits/services/habits.service';
import { BookStatus } from '../../../reader/models/book-status.model';
import { ReaderService } from '../../../reader/services/reader.service';
import { CalendarDisplayService } from '../../services/calendar-display.service';
import { CalendarGoogleService, type CalendarEvent } from '../../services/calendar-google.service';

/** British standard: week starts on Monday */
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** YYYY-MM-DD strings from start to end inclusive. */
function dateRangeInclusive(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(start + 'T12:00:00');
  const endDate = new Date(end + 'T12:00:00');
  if (d.getTime() > endDate.getTime()) return out;
  while (d.getTime() <= endDate.getTime()) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Google Calendar event colorId "1"–"11" → background and foreground (from Calendar API palette). */
const EVENT_COLORS: Record<string, { bg: string; fg: string }> = {
  '1': { bg: '#a4bdfc', fg: '#1d1d1d' },
  '2': { bg: '#7ae7bf', fg: '#1d1d1d' },
  '3': { bg: '#dbadff', fg: '#1d1d1d' },
  '4': { bg: '#ff887c', fg: '#1d1d1d' },
  '5': { bg: '#fbd75b', fg: '#1d1d1d' },
  '6': { bg: '#ffb878', fg: '#1d1d1d' },
  '7': { bg: '#46d6db', fg: '#1d1d1d' },
  '8': { bg: '#e1e1e1', fg: '#1d1d1d' },
  '9': { bg: '#5484ed', fg: '#fff' },
  '10': { bg: '#51b749', fg: '#1d1d1d' },
  '11': { bg: '#dc2127', fg: '#fff' },
};

export interface DayReadingItem {
  title: string;
  /** YYYY-MM-DD range so we can style first/mid/last day for spanning. */
  start: string;
  end: string;
}

export interface DayHabitItem {
  name: string;
  color: string;
}

interface DayCell {
  date: Date;
  isCurrentMonth: boolean;
  dayOfMonth: number;
  events: CalendarEvent[];
  habitItems: DayHabitItem[];
  readingItems: DayReadingItem[];
}

@Component({
  selector: 'app-calendar-month-view',
  standalone: true,
  imports: [NgStyle],
  templateUrl: './calendar-month-view.component.html',
})
export class CalendarMonthViewComponent {
  private calendarGoogle = inject(CalendarGoogleService);
  private displayOptions = inject(CalendarDisplayService);
  private habitsService = inject(HabitsService);
  private readerService = inject(ReaderService);

  readonly viewYear = signal(new Date().getFullYear());
  readonly viewMonth = signal(new Date().getMonth() + 1);
  readonly events = signal<CalendarEvent[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly displayGoogleCalendar = this.displayOptions.displayGoogleCalendar;
  readonly displayHabits = this.displayOptions.displayHabits;
  readonly displayReading = this.displayOptions.displayReading;
  readonly themeColor = this.displayOptions.themeColor;

  readonly monthLabel = computed(() => {
    const d = new Date(this.viewYear(), this.viewMonth() - 1, 1);
    return d.toLocaleDateString('default', { month: 'long', year: 'numeric' });
  });

  readonly dayNames = DAY_NAMES;

  private habitsByDay = computed(() => {
    const map = new Map<string, DayHabitItem[]>();
    if (!this.displayHabits()) return map;
    const habitsList = this.habitsService.habits();
    const completionsRecord = this.habitsService.completions();
    const habitById = new Map(habitsList.map((h) => [h.id, { name: h.name, color: h.color ?? '#58a6ff' }]));
    for (const [dateKey, ids] of Object.entries(completionsRecord)) {
      const items = (ids as string[])
        .map((id) => habitById.get(id))
        .filter((x): x is DayHabitItem => x != null);
      if (items.length) map.set(dateKey, items);
    }
    return map;
  });

  private readingByDay = computed(() => {
    const map = new Map<string, DayReadingItem[]>();
    if (!this.displayReading()) return map;
    const booksList = this.readerService.books();
    for (const book of booksList) {
      if (book.status !== BookStatus.Finished) continue;
      const end = book.readingEndDate?.slice(0, 10);
      if (!end) continue;
      const start = book.readingStartDate?.slice(0, 10) ?? end;
      const title = book.title || 'Untitled';
      for (const dateKey of dateRangeInclusive(start, end)) {
        const list = map.get(dateKey) ?? [];
        list.push({ title, start, end });
        map.set(dateKey, list);
      }
    }
    return map;
  });

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
    const habitsByDay = this.habitsByDay();
    const readingByDay = this.readingByDay();
    const makeCell = (d: Date, isCurrentMonth: boolean, dayOfMonth: number): DayCell => {
      const key = d.toISOString().slice(0, 10);
      return {
        date: d,
        isCurrentMonth,
        dayOfMonth,
        events: eventsByDay.get(key) ?? [],
        habitItems: habitsByDay.get(key) ?? [],
        readingItems: readingByDay.get(key) ?? [],
      };
    };
    const cells: DayCell[] = [];
    for (let i = 0; i < leading; i++) {
      const d = new Date(year, month - 1, 1 - leading + i);
      cells.push(makeCell(d, false, d.getDate()));
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month - 1, day);
      cells.push(makeCell(d, true, day));
    }
    const remaining = 42 - cells.length;
    for (let i = 0; i < remaining; i++) {
      const d = new Date(year, month, i + 1);
      cells.push(makeCell(d, false, d.getDate()));
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
      const showGoogle = this.displayGoogleCalendar();
      const y = this.viewYear();
      const m = this.viewMonth();
      if (conn?.connected && showGoogle) {
        this.fetchEvents(y, m);
      } else {
        this.events.set([]);
      }
    });
    effect(() => {
      if (this.displayHabits()) this.habitsService.load();
    });
    effect(() => {
      if (this.displayReading()) this.readerService.load();
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

  /** Styles for event block from colorId (defaults to accent if no colorId). */
  eventStyles(event: CalendarEvent): { backgroundColor: string; color: string } {
    const c = event.colorId ? EVENT_COLORS[event.colorId] : null;
    if (c) return { backgroundColor: c.bg, color: c.fg };
    return { backgroundColor: 'var(--accent)', color: 'var(--accent-contrast, #fff)' };
  }

  /** YYYY-MM-DD for a date (for reading span first/last day styling). */
  dateKey(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  /** Whether this cell is today (current calendar day). */
  isToday(cell: DayCell): boolean {
    const d = cell.date;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }
}
