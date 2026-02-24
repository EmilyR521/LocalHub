import { Routes } from '@angular/router';

export const vocabulistRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./vocabulist.component').then((m) => m.VocabulistComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./vocab-home/vocab-home.component').then(
            (m) => m.VocabHomeComponent
          ),
      },
      {
        path: 'practice',
        loadComponent: () =>
          import('./practice/practice.component').then(
            (m) => m.VocabulistPracticeComponent
          ),
      },
      {
        path: 'word/:id',
        loadComponent: () =>
          import('./word-detail/word-detail.component').then(
            (m) => m.WordDetailComponent
          ),
      },
    ],
  },
];
