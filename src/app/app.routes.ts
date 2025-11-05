import { RouterModule, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { SettingsAccountComponent } from './pages/settings-account/settings-account.component';
import { Signup } from './pages/signup/signup';
import { MainLayout } from './layouts/main-layout/main-layout';
import { MainPageComponent } from './pages/main-page/main-page.component';
import { SettingsProfileComponent } from './pages/settings-profile/settings-profile.component';
import { ArtistComponent } from './pages/artist/artist.component';
import { ProfileComponent } from './pages/profile/profile';

export const routes: Routes = [
  { path: '', component: Home }, //default route
  { path: 'signup', component: Signup }, //signup page
  { path: 'main-page', component: MainPageComponent } ,//main-page
  { path: 'artist', component: ArtistComponent }, //artist page
  { path: 'settings-account', component: SettingsAccountComponent }, //settings-accounts page
  { path: 'signup', component: Signup },
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
        path: 'search',
        loadComponent: () =>
          import('./pages/search-results/search-results').then(m => m.SearchResults)
      },
    ]
  },
  { path: 'settings-profile', component: SettingsProfileComponent }, //settings-profile page
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
