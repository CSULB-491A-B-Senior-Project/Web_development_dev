import { ChangeDetectionStrategy, Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AlbumCard } from '../../ui/album-card/album-card';

import { AccountService } from '../../services/account.service';
import { FollowService } from '../../services/follow.service';
import { UserAccount } from '../../models/account.models';
import { Artist, Album } from '../../models/playlist.models';

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  imports: [AlbumCard, CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {

  user = signal<UserAccount | null>(null);
  favoriteArtists = signal<Artist[] | null>(null);
  favoriteAlbums = signal<Album[] | null>(null);
  albumCount = signal<number>(0);
  followingCount = signal<number>(0);

  trackById = (_: number, it: any) => it.id;

  constructor(
    private accountService: AccountService,
    private followService: FollowService
  ) {}

  ngOnInit(): void {
    this.loadUser();
    this.loadFavoriteAlbums();
    this.loadFavoriteArtists();
  }

  // LOAD USER
  loadUser(): void {
    this.accountService.getAccount().subscribe({
      next: (account: UserAccount) => {
        this.user.set(account);

        // LOAD FOLLOWING COUNT
        this.loadFollowingCount(account.id);
        this.loadFavoriteAlbums();
        this.loadFavoriteArtists();
        
        console.log('User profile loaded:', this.user());
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
    this.accountService.favoriteAlbums().subscribe({
      next: (albums) => {
        this.favoriteAlbums.set(albums);
        console.log('Favorite albums loaded:', albums);
      },
      error: (error) => {
        console.error('Error loading favorite albums:', error);
      }
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
