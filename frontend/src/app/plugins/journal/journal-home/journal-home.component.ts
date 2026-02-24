import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { JournalService, toDateKey } from '../services/journal.service';

@Component({
  selector: 'app-journal-home',
  standalone: true,
  templateUrl: './journal-home.component.html',
})
export class JournalHomeComponent implements OnInit {
  private journalService = inject(JournalService);
  private route = inject(ActivatedRoute);

  readonly entry = this.journalService.entry;
  readonly currentDateKey = this.journalService.currentDateKeyReadonly;

  /** Bound to the date input (YYYY-MM-DD). */
  readonly dateInputValue = signal<string>('');
  /** Bound to the textarea. */
  readonly content = signal('');

  constructor() {
    effect(() => {
      const e = this.entry();
      const key = this.currentDateKey();
      if (key) {
        this.dateInputValue.set(key);
        this.content.set(e?.content ?? '');
      }
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const date = params.get('date');
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) this.journalService.selectDate(date);
    });
  }

  /** Today as YYYY-MM-DD for the date input. */
  readonly todayKey = computed(() => toDateKey(new Date()));

  /** Human-readable label for the selected date. */
  selectedDateLabel(): string {
    const key = this.currentDateKey();
    if (!key) return '';
    const d = this.parseDateKey(key);
    return d ? d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : key;
  }

  onDateKeyChange(key: string | null): void {
    if (key) this.journalService.selectDate(key);
  }

  goToToday(): void {
    this.journalService.goToToday();
  }

  save(): void {
    this.journalService.save(this.content());
  }

  onContentInput(value: string): void {
    this.content.set(value);
  }

  /** Parse YYYY-MM-DD to Date (noon UTC to avoid TZ issues). */
  private parseDateKey(key: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
    if (!match) return null;
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const d = parseInt(match[3], 10);
    const date = new Date(y, m, d);
    return isNaN(date.getTime()) ? null : date;
  }
}
