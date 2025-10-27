import { RouterModule, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { SettingsAccountComponent } from './pages/settings-account/settings-account.component';
import { Signup } from './pages/signup/signup';
import { MainLayout } from './layouts/main-layout/main-layout';
import { SettingsProfileComponent } from './pages/settings-profile/settings-profile.component';
import { ArtistComponent } from './pages/artist/artist.component';
import { Explore } from './pages/explore/explore';

export const routes: Routes = [
  { path: '', component: Home }, //default route
  { path: 'signup', component: Signup }, //signup page
  { path: 'artist', component: ArtistComponent }, //artist page
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
    ]
  },
  { path: 'settings-profile', component: SettingsProfileComponent } //settings-profile page
];
export class AppRoutingModule { }
