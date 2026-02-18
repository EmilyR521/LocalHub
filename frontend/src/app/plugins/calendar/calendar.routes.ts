import { Routes } from '@angular/router';

export const calendarRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./calendar.component').then((m) => m.CalendarComponent),
  },
];
