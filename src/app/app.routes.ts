import { RouterModule, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Signup } from './pages/signup/signup';
import { MainLayout } from './layouts/main-layout/main-layout';
import { Explore } from './pages/explore/explore';
import { Artist } from './pages/artist/artist';
import { ProfileComponent } from './pages/profile/profile';
import { ListCreateComponent } from './pages/list-create/list-create';
import { SettingsProfile } from './pages/settings-profile/settings-profile';
import { SettingsAccount } from './pages/settings-account/settings-account';
import { PlayerTestComponent } from './pages/player-test/player-test.component';
import { SpotifyCallbackComponent } from './pages/spotify-callback/spotify-callback.component';
import { AdminUser } from './pages/admin/admin-user';
import { AdminPost } from './pages/admin/admin-post';
import { AlbumDetailsComponent } from './pages/album-details/album-details.component';
import { authGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Guest-only routes (redirect to explore if authenticated)
  {
    path: '',
    component: Home,
    canActivate: [guestGuard]
  },
  {
    path: 'signup',
    component: Signup,
    canActivate: [guestGuard]
  },
  { path: 'settings-account', component: SettingsAccount }, //settings-accounts page
  { path: 'settings-profile', component: SettingsProfile }, //settings-profile page
  { path: 'admin-user', component: AdminUser }, //admin user page
  { path: 'admin-post', component: AdminPost }, //admin post page
  // Protected routes (require authentication)
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'explore',
        loadComponent: () => import('./pages/explore/explore')
          .then(m => m.Explore)
      },
      {
        path: 'albums/:id',
        component: AlbumDetailsComponent
      },
      {
        path: 'my-album-details/:id',
        loadComponent: () =>
          import('./pages/my-album-details/my-album-details.component')
            .then(m => m.MyAlbumDetailsComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile')
          .then(m => m.ProfileComponent)
      },
      {
        path: 'artist/:id',
        loadComponent: () => import('./pages/artist/artist')
          .then(m => m.Artist)
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./pages/search-results/search-results').then(m => m.SearchResults)
      },
      {
        path: 'list-create',
        loadComponent: () => import('./pages/list-create/list-create')
          .then(m => m.ListCreateComponent)
      },
      {
        path: 'player-test',
        component: PlayerTestComponent
      },
      {
        path: 'spotify/callback',
        component: SpotifyCallbackComponent
      } ,
    ]
  },
  { path: 'profile', loadComponent: () => import('./pages/profile/profile').then(m => m.ProfileComponent) },
  // {
  //   path: 'lists/new',
  //   loadComponent: () => import('./pages/list-create/list-create').then(m => m.ListCreateComponent)
  // },
  // Wildcard route - redirect to home
  { path: '**', redirectTo: '' }
];
export class AppRoutingModule { }
