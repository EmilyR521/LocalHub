import { Routes } from '@angular/router';

export const habitsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./habits.component').then((m) => m.HabitsComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./today-habits/today-habits.component').then((m) => m.TodayHabitsComponent),
      },      
    ],
  },
];
