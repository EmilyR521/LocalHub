import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationBarComponent, type NavigationBarItem } from '../../shared/components/navigation-bar/navigation-bar.component';
import { JournalService } from './services/journal.service';

@Component({
  selector: 'app-journal',
  standalone: true,
  imports: [RouterOutlet, NavigationBarComponent],
  template: `
    <header class="page-header">
      <h1>Journal</h1>
      <p class="subtitle">Daily free-text entries. Pick a date and write.</p>
    </header>
    <app-navigation-bar
      [items]="journalNavItems"
      ariaLabel="Journal views" />
    <router-outlet />
  `,
})
export class JournalComponent implements OnInit {
  readonly journalNavItems: NavigationBarItem[] = [
    { label: 'Today', route: '/plugins/journal', exact: true },
    { label: 'Previous entries', route: '/plugins/journal/entries' },
  ];

  private journalService = inject(JournalService);

  ngOnInit(): void {
    this.journalService.load();
    this.journalService.setInitialDateToToday();
  }
}
