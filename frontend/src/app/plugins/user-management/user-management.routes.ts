import { Routes } from '@angular/router';

export const userManagementRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./user-management.component').then((m) => m.UserManagementComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'profile' },
      {
        path: 'profile',
        loadComponent: () =>
          import('./my-profile/my-profile.component').then((m) => m.MyProfileComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./all-users/all-users.component').then((m) => m.AllUsersComponent),
      },
    ],
  },
];
