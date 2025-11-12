import { RouterModule, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { SettingsAccountComponent } from './pages/settings-account/settings-account';
import { Signup } from './pages/signup/signup';
import { MainLayout } from './layouts/main-layout/main-layout';
import { SettingsProfileComponent } from './pages/settings-profile/settings-profile';
import { ArtistComponent } from './pages/artist/artist';
import { Explore } from './pages/explore/explore';
import { ProfileComponent } from './pages/profile/profile';

export const routes: Routes = [
  { path: '', component: Home }, //default route
  { path: 'signup', component: Signup }, //signup page
  { path: 'settings-profile', component: SettingsProfile }, //settings-profile page
  { path: 'settings-account', component: SettingsAccount }, //settings-accounts page
  { path: 'explore-page', component: Explore }, //explore page
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
          .then(m => m.Profile)
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
  { path: 'settings-profile', component: SettingsProfile }, //settings-profile page
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
