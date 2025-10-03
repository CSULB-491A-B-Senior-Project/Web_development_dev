import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { SettingsAccountComponent } from './pages/settings-account/settings-account.component';

export const routes: Routes = [
  { path: '', component: Home }, //default route
  { path: 'settings-account', component: SettingsAccountComponent }, //settings-accounts page
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }