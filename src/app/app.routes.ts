import { RouterModule, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { SettingsAccountComponent } from './pages/settings-account/settings-account.component';
import { Signup } from './pages/signup/signup';
import { MainPageComponent } from './pages/main-page/main-page.component';

export const routes: Routes = [
  { path: '', component: Home }, //default route
  { path: 'settings-account', component: SettingsAccountComponent }, //settings-accounts page
  { path: 'signup', component: Signup},
  { path: 'main-page', component: MainPageComponent}
];
export class AppRoutingModule { }
