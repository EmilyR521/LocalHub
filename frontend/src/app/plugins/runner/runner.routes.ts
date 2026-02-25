import { Routes } from '@angular/router';

export const runnerRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./runner.component').then((m) => m.RunnerComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'plan' },
      {
        path: 'plan',
        loadComponent: () =>
          import('./views/your-plan/your-plan.component').then((m) => m.YourPlanComponent),
      },
      {
        path: 'plan-generator',
        loadComponent: () =>
          import('./views/plan-generator/plan-generator.component').then((m) => m.PlanGeneratorComponent),
      },
      {
        path: 'recent',
        loadComponent: () =>
          import('./views/recent-runs/recent-runs.component').then((m) => m.RecentRunsComponent),
      },
      {
        path: 'trends',
        loadComponent: () =>
          import('./views/running-trends/running-trends.component').then((m) => m.RunningTrendsComponent),
      },
    ],
  },
];
