import { RouterModule, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { SettingsAccountComponent } from './pages/settings-account/settings-account.component';
import { Signup } from './pages/signup/signup';
import { MainLayout } from './layouts/main-layout/main-layout';
import { SettingsProfileComponent } from './pages/settings-profile/settings-profile.component';
import { ArtistComponent } from './pages/artist/artist.component';
import { Explore } from './pages/explore/explore';
import { ProfileComponent } from './pages/profile/profile';

export const routes: Routes = [
  { path: '', component: Home }, //default route
  { path: 'signup', component: Signup }, //signup page
  { path: 'settings-profile', component: SettingsProfileComponent }, //settings-profile page
  { path: 'settings-account', component: SettingsAccountComponent }, //settings-accounts page
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
          .then(m => m.ProfileComponent)
      },
      {
        path: 'artist',
        loadComponent: () => import('./pages/artist/artist.component')
          .then(m => m.ArtistComponent)
      }
    ]
  },
  { path: 'settings-profile', component: SettingsProfileComponent }, //settings-profile page
  { path: 'profile', loadComponent: () => import('./pages/profile/profile').then(m => m.ProfileComponent) },
];
export class AppRoutingModule { }
