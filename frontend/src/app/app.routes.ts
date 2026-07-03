import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login-page.component').then((m) => m.LoginPageComponent)
  },
  {
    path: 'signup',
    loadComponent: () => import('./features/auth/signup-page.component').then((m) => m.SignupPageComponent)
  },
  {
    path: 'app',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard-page.component').then((m) => m.DashboardPageComponent)
      },
      {
        path: 'library',
        loadComponent: () => import('./features/library/library-page.component').then((m) => m.LibraryPageComponent)
      },
      {
        path: 'library/:id',
        loadComponent: () => import('./features/library/material-detail-page.component').then((m) => m.MaterialDetailPageComponent)
      },
      {
        path: 'upload',
        loadComponent: () => import('./features/upload/upload-page.component').then((m) => m.UploadPageComponent)
      },
      {
        path: 'link',
        loadComponent: () => import('./features/upload/link-create-page.component').then((m) => m.LinkCreatePageComponent)
      },
      {
        path: 'categories',
        loadComponent: () => import('./features/categories/categories-page.component').then((m) => m.CategoriesPageComponent)
      },
      {
        path: 'paths',
        loadComponent: () => import('./features/paths/paths-page.component').then((m) => m.PathsPageComponent)
      },
      {
        path: 'paths/:id',
        loadComponent: () => import('./features/paths/path-detail-page.component').then((m) => m.PathDetailPageComponent)
      },
      {
        path: 'graph',
        loadComponent: () => import('./features/graph/graph-page.component').then((m) => m.GraphPageComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile-page.component').then((m) => m.ProfilePageComponent)
      },
      {
        path: 'reader/:materialId',
        loadComponent: () => import('./features/reader/reader-page.component').then((m) => m.ReaderPageComponent)
      },
      {
        path: 'admin/users',
        loadComponent: () => import('./features/admin/admin-users-page.component').then((m) => m.AdminUsersPageComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings-page.component').then((m) => m.SettingsPageComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
