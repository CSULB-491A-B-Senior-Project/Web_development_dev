import { ChangeDetectionStrategy, Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AlbumCard } from '../../ui/album-card/album-card';

import { AccountService } from '../../services/account.service';
import { FollowService } from '../../services/follow.service';
import { ProfileService, UserProfile } from '../../services/profile.service';

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
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  imports: [AlbumCard, CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  // demo state (swap for real data)
  username = signal('Username');
  albumsCount = signal(0);
  followingCount = signal(0);

  user = signal<UserProfile | null>(null);
  favoriteAlbums = signal<Album[]>([]);
  favoriteArtists = signal<string[]>([]);
  recentAlbums = signal<Album[]>([]);

  trackById = (_: number, it: Album) => it.albumId;

  constructor(
    private accountService: AccountService,
    private profileService: ProfileService,
    private followService: FollowService
  ) {}

  ngOnInit(): void {
    this.loadUser();
    this.loadFollowingCount(this.user()?.id || '');
    this.loadFavoriteAlbums();
    this.loadFavoriteArtists();
  }

  // LOAD USER
  loadUser(): void {
    this.profileService.getProfile().subscribe({
      next: (data: UserProfile) => {
        this.user.set(data);
        this.username.set(data.username || 'Username');
        console.log('User profile loaded:', data);
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
      }
    });
  }
  // GET FOLLOWING COUNT
  loadFollowingCount(userId: string): void {
    this.followService.getUserFollowCount(userId).subscribe((count) => {
      this.followingCount.set(count.followingCount);
      console.log('Following count loaded:', count);
    });
  }

  // LOAD FAVORITE ALBUMS
  loadFavoriteAlbums(): void {
    this.profileService.getFavoriteAlbums().subscribe({
      // next: (data: Album[]) => {
      //   this.favoriteAlbums.set(data);
      //   this.albumsCount.set(data.length);
      //   console.log('Favorite albums loaded:', data);
      // },
      // error: (error) => {
      //   console.error('Error loading favorite albums:', error);
      // }
    });
  }
  // LOAD FAVORITE ARTISTS
  loadFavoriteArtists(): void {
    // Replace with actual API call to fetch favorite artists
  }

  // ALBUM DATA
  // private readonly originalAlbums: Album[] = [
  //   {
  //     albumId: 1,
  //     title: 'Album D',
  //     artist: 'Artist D',
  //     dateLabel: 'Oct. 15, 2025',
  //     imageUrl: 'https://picsum.photos/seed/card-1/600/600'
  //   },
  //   {
  //     albumId: 2,
  //     title: 'Album C',
  //     artist: 'Artist D',
  //     dateLabel: 'Oct. 11, 2025',
  //     imageUrl: 'https://picsum.photos/seed/card-2/600/600'
  //   },
  //   {
  //     albumId: 3,
  //     title: 'Album A',
  //     artist: 'Artist D',
  //     dateLabel: 'Oct. 13, 2025',
  //     imageUrl: 'https://picsum.photos/seed/card-3/600/600'
  //   },
  // ];
  

}
