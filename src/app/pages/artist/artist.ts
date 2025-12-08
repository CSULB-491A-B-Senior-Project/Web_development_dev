import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { AlbumCard } from '../../ui/album-card/album-card';
import { ArtistDetails, Album, Artist as ArtistModel } from '../../models/playlist.models';
import { ArtistService } from '../../services/artist.service';
import { FollowService } from '../../services/follow.service';


@Component({
    selector: 'app-artist',
    standalone: true,
    templateUrl: './artist.html',
    styleUrls: ['./artist.scss'],
    imports: [AlbumCard, CommonModule, RouterModule],
})
export class Artist {

    artist = signal<ArtistDetails | null>(null);
    albums = signal<Album[]>([]);
    followed = signal<boolean>(false);

    trackById = (_: number, it: Album) => it.id;

    private route = inject(ActivatedRoute);
    private artistService = inject(ArtistService);
    private followService = inject(FollowService);

    constructor() {
        const artistId = this.route.snapshot.paramMap.get('id'); // Example artist ID
        if (artistId) {
            this.loadArtist(artistId);
            this.loadAlbums(artistId);
            this.isFollowingArtist(artistId);
        }
    }

    // LOAD ARTIST DATA
    loadArtist(artistId: string): void {
        this.artistService.getArtist(artistId).subscribe({
            next: (data: ArtistDetails) => {
                this.artist.set(data);
                console.log('Artist data loaded:', data);
            },
            error: (err) => {
                console.error('Error loading artist data:', err);
            }
        });
    }

    // LOAD ALBUM DATA
    loadAlbums(artistId: string): void {
        this.artistService.getArtistAlbums(artistId).subscribe({
            next: (list: any[]) => {
                console.log('Albums data loaded:', list);
                this.albums.set(
                    list.map(dto => {
                        const first = dto.artists?.[0];

                        const artist: ArtistModel = {
                            id: first?.id ?? artistId,
                            artistName: first?.name ?? this.artist()?.name ?? 'Unknown Artist'
                        };
                        
                        return {
                            id: dto.id,
                            title: dto.title,
                            releaseYear: new Date(dto.releaseDate).getFullYear(),
                            artist,
                            albumCover: dto.coverArt ?? '/assets/placeholder.png'
                        } as Album;
                    })
                );
            },
            error: (err) => {
                console.error('Error loading albums data:', err);
            }
        });
    }

    // LOAD FOLLOW STATE
    isFollowingArtist(artistId: string): void {
        this.followService.isFollowingArtist(artistId).subscribe({
            next: ({ isFollowing }: { isFollowing: boolean }) => {
              console.log(`Follow state loaded: ${isFollowing}`);
              this.followed.set(isFollowing); 
            },
            error: (err) => {
                console.error('Error loading follow state:', err);
            }
        });
    }

    // TOGGLE FOLLOW STATE
    toggleFollow(): void {
        const artistId = this.route.snapshot.paramMap.get('id');
        if (!artistId) return;
        
        const call = this.followed()
            ? this.followService.unfollowArtist(artistId)
            : this.followService.followArtist(artistId);

        call.subscribe({
          next: () => {
            this.followed.update(val => !val);
            this.loadArtist(artistId);
          },
          error: (err) => {
            console.error('Error toggling follow:', err);
          }
        });
    }
    
    // SORT BY TITLE
    sortByTitleAsc() {
        const sorted = [...this.albums()].sort((a, b) => a.title.localeCompare(b.title));
        this.albums.set(sorted);
    }
    sortByTitleDesc() {
        const sorted = [...this.albums()].sort((a, b) => b.title.localeCompare(a.title));
        this.albums.set(sorted);
    }
    // SORT BY DATE
    sortByDateAsc() {
        const sorted = [...this.albums()].sort(
        (a, b) => new Date(a.releaseYear).getTime() - new Date(b.releaseYear).getTime());
        this.albums.set(sorted);
    }
    sortByDateDesc() {
        const sorted = [...this.albums()].sort(
        (a, b) => new Date(b.releaseYear).getTime() - new Date(a.releaseYear).getTime());
        this.albums.set(sorted);
    }
}
