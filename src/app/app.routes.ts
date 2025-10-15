import { RouterModule, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { SettingsAccountComponent } from './pages/settings-account/settings-account.component';
import { Signup } from './pages/signup/signup';
import { MainLayout } from './layouts/main-layout/main-layout';

export const routes: Routes = [
  { path: '', component: Home }, //default route
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
    ]
  },
];
export class AppRoutingModule { }
