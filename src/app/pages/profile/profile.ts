import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AlbumCard } from '../../ui/album-card/album-card';

// ALBUM TYPE
type Album = {
  albumId: number;
  title: string;
  artist: string;
  dateLabel: string;
  imageUrl: string;
};
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [AlbumCard, CommonModule, RouterLink],
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
  // ALBUM DATA
  private readonly originalAlbums: Album[] = [
    {
      albumId: 1,
      title: 'Album D',
      artist: 'Artist D',
      dateLabel: 'Oct. 15, 2025',
      imageUrl: 'https://picsum.photos/seed/card-1/600/600'
    },
    {
      albumId: 2,
      title: 'Album C',
      artist: 'Artist D',
      dateLabel: 'Oct. 11, 2025',
      imageUrl: 'https://picsum.photos/seed/card-2/600/600'
    },
    {
      albumId: 3,
      title: 'Album A',
      artist: 'Artist D',
      dateLabel: 'Oct. 13, 2025',
      imageUrl: 'https://picsum.photos/seed/card-3/600/600'
    },
  ];
  albums = signal<Album[]>([...this.originalAlbums]);

  trackById = (_: number, it: Album) => it.albumId;
  favoriteArtists = signal<string[]>(['artist1', 'artist2', 'artist3', 'artist4', 'artist5']);
}
