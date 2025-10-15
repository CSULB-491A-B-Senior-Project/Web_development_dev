import { RouterModule, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { SettingsAccountComponent } from './pages/settings-account/settings-account.component';
import { Signup } from './pages/signup/signup';
import { MainPageComponent } from './pages/main-page/main-page.component';
import { SettingsProfileComponent } from './pages/settings-profile/settings-profile.component';

export const routes: Routes = [
  { path: '', component: Home }, //default route
  { path: 'signup', component: Signup }, //signup page
  { path: 'main-page', component: MainPageComponent } ,//main-page
  { path: 'settings-account', component: SettingsAccountComponent }, //settings-accounts page
  { path: 'settings-profile', component: SettingsProfileComponent } //settings-profile page
];
export class AppRoutingModule { }
