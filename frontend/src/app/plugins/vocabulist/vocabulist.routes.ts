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
          import('./views/vocab-home/vocab-home.component').then(
            (m) => m.VocabHomeComponent
          ),
      },
      {
        path: 'practice',
        loadComponent: () =>
          import('./views/practice/practice.component').then(
            (m) => m.VocabulistPracticeComponent
          ),
      },
      {
        path: 'grammar',
        loadComponent: () =>
          import('./views/grammar/grammar.component').then(
            (m) => m.VocabulistGrammarComponent
          ),
      },
      {
        path: 'word/:id',
        loadComponent: () =>
          import('./components/word-detail/word-detail.component').then(
            (m) => m.WordDetailComponent
          ),
      },
    ],
  },
];
