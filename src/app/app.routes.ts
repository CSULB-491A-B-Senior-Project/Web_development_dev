import { RouterModule, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { SettingsAccount } from './pages/settings-account/settings-account';
import { Signup } from './pages/signup/signup';
import { MainLayout } from './layouts/main-layout/main-layout';
import { SettingsProfile } from './pages/settings-profile/settings-profile';
import { Artist } from './pages/artist/artist';
import { Explore } from './pages/explore/explore';
import { ProfileComponent } from './pages/profile/profile';
import { AlbumDetailsComponent } from './pages/album-details/album-details.component';

export const routes: Routes = [
  { path: '', component: Home }, //default route
  { path: 'signup', component: Signup }, //signup page
  { path: 'settings-profile', component: SettingsProfile }, //settings-profile page
  { path: 'settings-account', component: SettingsAccount }, //settings-accounts page
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
        path: 'album-details',
        component: AlbumDetailsComponent
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
        {
            path: 'lists/new',
            loadComponent: () => import('./pages/list-create/list-create').then(m => m.ListCreateComponent)
        },
    ]
    },
];
export class AppRoutingModule { }
