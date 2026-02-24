import { Routes } from '@angular/router';

export const journalRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./journal.component').then((m) => m.JournalComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./journal-home/journal-home.component').then((m) => m.JournalHomeComponent),
      },
      {
        path: 'entries',
        loadComponent: () =>
          import('./journal-entries-list/journal-entries-list.component').then((m) => m.JournalEntriesListComponent),
      },
    ],
  },
];
