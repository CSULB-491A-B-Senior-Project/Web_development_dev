import { RouterModule, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Signup } from './pages/signup/signup';
import { MainLayout } from './layouts/main-layout/main-layout';

import { Explore } from './pages/explore/explore';
import { Artist } from './pages/artist/artist';
import { ProfileComponent } from './pages/profile/profile';

import { SettingsProfile } from './pages/settings-profile/settings-profile';
import { SettingsAccount } from './pages/settings-account/settings-account';

import { AdminUser } from './pages/admin/admin-user';
import { AdminPost } from './pages/admin/admin-post';

export const routes: Routes = [
  { path: '', component: Home }, //default route
  { path: 'signup', component: Signup }, //signup page
  { path: 'explore-page', component: Explore }, //explore page
  { path: 'settings-account', component: SettingsAccount }, //settings-accounts page
  { path: 'settings-profile', component: SettingsProfile }, //settings-profile page
  { path: 'admin-user', component: AdminUser }, //admin user page
  { path: 'admin-post', component: AdminUser }, //admin post page
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: 'explore',
        loadComponent: () => import('./pages/explore/explore')
          .then(m => m.Explore)
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile')
          .then(m => m.ProfileComponent)
      },
      {
        path: 'artist',
        loadComponent: () => import('./pages/artist/artist')
          .then(m => m.Artist)
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./pages/search-results/search-results').then(m => m.SearchResults)
      },
    ]
  },
  { path: 'profile', loadComponent: () => import('./pages/profile/profile').then(m => m.ProfileComponent) },
  {
    path: 'lists/new',
    loadComponent: () => import('./pages/list-create/list-create').then(m => m.ListCreateComponent)
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./pages/search-results/search-results').then(m => m.SearchResults)
  },
];
export class AppRoutingModule { }
