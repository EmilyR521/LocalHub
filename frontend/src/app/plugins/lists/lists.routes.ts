import { Routes } from '@angular/router';

export const listsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./lists.component').then((m) => m.ListsComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./list-home/list-home.component').then((m) => m.ListHomeComponent),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./list-detail/list-detail.component').then((m) => m.ListDetailComponent),
      },
    ],
  },
];
