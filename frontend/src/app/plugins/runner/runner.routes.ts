import { Routes } from '@angular/router';

export const runnerRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./runner.component').then((m) => m.RunnerComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'recent' },
      {
        path: 'planner',
        loadComponent: () =>
          import('./run-planner/run-planner.component').then((m) => m.RunPlannerComponent),
      },
      {
        path: 'recent',
        loadComponent: () =>
          import('./recent-runs/recent-runs.component').then((m) => m.RecentRunsComponent),
      },
    ],
  },
];
