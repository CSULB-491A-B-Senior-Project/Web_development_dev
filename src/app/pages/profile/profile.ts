import { ChangeDetectionStrategy, Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AlbumCard } from '../../ui/album-card/album-card';

import { AccountService } from '../../services/account.service';
import { FollowService } from '../../services/follow.service';
import { PlaylistResponse, PlaylistService } from '../../services/playlist.service';

import { UserAccount } from '../../models/account.models';
import { Artist, Album } from '../../models/playlist.models';
import { MyAlbumCard } from "../../ui/my-album-card/my-album-card";

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  imports: [AlbumCard, CommonModule, RouterLink, MyAlbumCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {

  user = signal<UserAccount | null>(null);
  favoriteArtists = signal<Artist[] | null>(null);
  favoriteAlbums = signal<Album[] | null>(null);
  myAlbums = signal<PlaylistResponse[] | null>(null);
  albumCount = signal<number>(0);
  followingCount = signal<number>(0);

  trackById = (_: number, it: any) => it.id;

  constructor(
    private accountService: AccountService,
    private followService: FollowService,
    private playlistService: PlaylistService
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
        this.loadMyPlaylistsAndCount();
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
    this.followService.getUserFollowCount(userId).subscribe((list) => {
      this.followingCount.set(list.length);
      console.log('Following count loaded:', this.followingCount);
    });
  }

  // GET MY PLAYLISTS AND COUNT AND DISPLAY
  loadMyPlaylistsAndCount(): void {
    this.playlistService.getUserPlaylists().subscribe({
      next: (playlists) => {
        this.myAlbums.set(playlists);
        this.albumCount.set(playlists.length);
        console.log('My playlists loaded:', playlists);
        console.log('Playlist count loaded:', playlists.length);
      },
      error: (err) => {
        console.error('Error loading playlist count:', err);
      }
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
    this.accountService.favoriteArtists().subscribe({
      next: (artists) => {
        this.favoriteArtists.set(artists);
        console.log('Favorite artists loaded:', artists);
      },
      error: (error) => {
        console.error('Error loading favorite artists:', error);
      }
    })
  }
}
