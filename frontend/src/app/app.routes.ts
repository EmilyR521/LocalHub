import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./hub/hub.component').then((m) => m.HubComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./hub/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'plugins/reader',
        loadChildren: () =>
          import('./plugins/reader/reader.routes').then((m) => m.readerRoutes),
      },
      {
        path: 'plugins/runner',
        loadChildren: () =>
          import('./plugins/runner/runner.routes').then((m) => m.runnerRoutes),
      },
      {
        path: 'plugins/calendar',
        loadChildren: () =>
          import('./plugins/calendar/calendar.routes').then((m) => m.calendarRoutes),
      },
      {
        path: 'plugins/lists',
        loadChildren: () =>
          import('./plugins/lists/lists.routes').then((m) => m.listsRoutes),
      },
      {
        path: 'plugins/habits',
        loadChildren: () =>
          import('./plugins/habits/habits.routes').then((m) => m.habitsRoutes),
      },
      {
        path: 'plugins/vocabulist',
        loadChildren: () =>
          import('./plugins/vocabulist/vocabulist.routes').then((m) => m.vocabulistRoutes),
      },
      {
        path: 'plugins/user-management',
        loadChildren: () =>
          import('./plugins/user-management/user-management.routes').then((m) => m.userManagementRoutes),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
