import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { JournalService } from './services/journal.service';

@Component({
  selector: 'app-journal',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="page-header">
      <h1>Journal</h1>
      <p class="subtitle">Daily free-text entries. Pick a date and write.</p>
    </header>
    <div class="reader-tabs" aria-label="Journal views">
      <a routerLink="/plugins/journal" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="btn secondary">Today</a>
      <a routerLink="/plugins/journal/entries" routerLinkActive="active" class="btn secondary">Previous entries</a>
    </div>
    <router-outlet />
  `,
})
export class JournalComponent implements OnInit {
  private journalService = inject(JournalService);

  ngOnInit(): void {
    this.journalService.load();
    this.journalService.setInitialDateToToday();
  }
}
