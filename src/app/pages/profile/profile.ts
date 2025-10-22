import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  // demo state (swap for real data)
  username = signal('Username');
  albumsCount = signal(0);
  followingCount = signal(0);

  avatarUrl = signal<string>('https://picsum.photos/seed/card-111/500/500/'); // leave empty to show circle placeholder
  favoriteAlbumUrls = signal<string[]>(['https://picsum.photos/seed/card-14/500/500/', 'https://picsum.photos/seed/card-12/500/500/', 'https://picsum.photos/seed/card-10/500/500/']);
  recentAlbumUrls = signal<string[]>(['https://picsum.photos/seed/card-30/500/500/', 'https://picsum.photos/seed/card-25/500/500/', 'https://picsum.photos/seed/card-9/500/500/']);
  favoriteArtists = signal<string[]>(['artist1', 'artist2', 'artist3', 'artist4','artist5']);
}
