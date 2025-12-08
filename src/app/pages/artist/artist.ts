import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { AlbumCard } from '../../ui/album-card/album-card';
import { ArtistDetails, Album, ArtistAlbum } from '../../models/playlist.models';
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
    albums = signal<ArtistAlbum[]>([]);
    followed = signal<boolean>(false);

    trackById = (_: number, it: ArtistAlbum) => it.id;

    constructor(
        private artistService: ArtistService,
        private followService: FollowService,
        private route: ActivatedRoute
    ) {}

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            const artistId = params.get('id');

            if (artistId) {
                this.loadArtist(artistId);
                this.loadAlbums(artistId);
                this.isFollowingArtist(artistId);
            }
        });
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
            next: (list: ArtistAlbum[]) => {
                this.albums.set(list);
                console.log(this.albums());
                console.log('Albums data loaded:', list);
            },
            error: (err) => {
                console.error('Error loading albums data:', err);
            }
        });
    }

    // LOAD FOLLOW STATE
    isFollowingArtist(artistId: string): void {
        this.followService.isFollowingArtist(artistId).subscribe({
            next: (isFollowing: boolean) => {
                this.followed.set(isFollowing);
                console.log('Follow state loaded: ${isFollowing}');
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

        call.subscribe(() => this.loadArtist(artistId));
        this.followed.set(!this.followed());
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
        (a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());
        this.albums.set(sorted);
    }
    sortByDateDesc() {
        const sorted = [...this.albums()].sort(
        (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
        this.albums.set(sorted);
    }
}
