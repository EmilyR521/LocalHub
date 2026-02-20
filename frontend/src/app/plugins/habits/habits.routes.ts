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
          import('./habit-home/habit-home.component').then((m) => m.HabitHomeComponent),
      },
    ],
  },
];
