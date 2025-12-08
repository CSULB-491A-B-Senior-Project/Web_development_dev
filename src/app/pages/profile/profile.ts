import { ChangeDetectionStrategy, Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AlbumCard } from '../../ui/album-card/album-card';

import { AccountService } from '../../services/account.service';
import { UserAccount } from '../../models/account.models';
import { FollowService } from '../../services/follow.service';

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
export class ProfileComponent implements OnInit {
  // demo state (swap for real data)
  username = signal('Username');
  albumsCount = signal(0);
  followingCount = signal(0);

  user = signal<UserAccount | null>(null);
  favoriteAlbums = signal<Album[]>([]);
  favoriteArtists = signal<string[]>([]);
  recentAlbums = signal<Album[]>([]);


  constructor(
    private accountService: AccountService,
    private followService: FollowService
  ) {}

  ngOnInit(): void {
    this.accountService.getAccount().subscribe((account:UserAccount) => {
      this.user.set(account);
      console.log('User account loaded:', account);
      const userId = account.id;

      // GET FOLLOWING COUNT
      this.followService.getUserFollowCount(userId).subscribe((count) => {
      this.followingCount.set(count.followingCount);
      console.log('Following count loaded:', count);
      });
    });
    
    
    this.accountService.favoriteArtists().subscribe(() => {
      
    });
  }

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
}
