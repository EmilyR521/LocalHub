import { Routes } from '@angular/router';

export const readerRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./reader.component').then((m) => m.ReaderComponent),
  },
];
