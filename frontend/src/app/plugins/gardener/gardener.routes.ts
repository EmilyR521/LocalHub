import { Routes } from '@angular/router';

export const gardenerRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./gardener.component').then((m) => m.GardenerComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./views/plants-list/plants-list.component').then((m) => m.PlantsListComponent),
      },
      {
        path: 'schedule',
        loadComponent: () =>
          import('./views/schedule/schedule.component').then((m) => m.ScheduleComponent),
      },
      {
        path: 'zones',
        loadComponent: () =>
          import('./views/zones/zones.component').then((m) => m.ZonesComponent),
      },
      {
        path: 'jobs',
        loadComponent: () =>
          import('./views/jobs/jobs.component').then((m) => m.JobsComponent),
      },
    ],
  },
];
