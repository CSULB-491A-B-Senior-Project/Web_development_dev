import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlbumCard } from '../../ui/album-card/album-card';

// ARTIST TYPE
type artist = {
    artistId: number;
    name: string;
    followers: number;
    albums: string[];
    bio: string;
    profileUrl: string;
};

// ALBUM TYPE
type Album = {
    albumId: number;
    title: string;
    artist: string;
    dateLabel: string;
    imageUrl: string;
};
@Component({
    selector: 'app-artist',
    templateUrl: './artist.html',
    styleUrls: ['./artist.scss'],
    imports: [AlbumCard, CommonModule]
})
export class Artist {
    // ARTIST DATA
    artist_1 = {
        artistId: 999,
        name: 'Artist Name',
        followers: 9999,
        albums: ['Album 1', 'Album 2', 'Album 3'],
        bio: 'This is a sample biography of the artist. It provides some background information and interesting facts about the artist\'s career and achievements. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        profileUrl: 'https://picsum.photos/seed/artist-profile/600/600'
    };
    // ALBUM DATA
    private readonly originalAlbums: Album[] = [
    {
        albumId: 1,
        title: 'Album D',
        artist: 'Artist A',
        dateLabel: 'Oct. 15, 2025',
        imageUrl: 'https://picsum.photos/seed/card-1/600/600'
    },
    {
        albumId: 2,
        title: 'Album C',
        artist: 'Artist A',
        dateLabel: 'Oct. 11, 2025',
        imageUrl: 'https://picsum.photos/seed/card-2/600/600'
    },
    {
        albumId: 3,
        title: 'Album A',
        artist: 'Artist A',
        dateLabel: 'Oct. 13, 2025',
        imageUrl: 'https://picsum.photos/seed/card-3/600/600'
    },
    {
        albumId: 4,
        title: 'Album E',
        artist: 'Artist A',
        dateLabel: 'Oct. 12, 2025',
        imageUrl: 'https://picsum.photos/seed/card-4/600/600'
    },
    {
        albumId: 5,
        title: 'Album B',
        artist: 'Artist A',
        dateLabel: 'Oct. 14, 2025',
        imageUrl: 'https://picsum.photos/seed/card-5/600/600'
    },
    ];
    albums = signal<Album[]>([...this.originalAlbums]);

    trackById = (_: number, it: Album) => it.albumId;
    
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
        (a, b) => new Date(a.dateLabel).getTime() - new Date(b.dateLabel).getTime());
        this.albums.set(sorted);
    }
    sortByDateDesc() {
        const sorted = [...this.albums()].sort(
        (a, b) => new Date(b.dateLabel).getTime() - new Date(a.dateLabel).getTime());
        this.albums.set(sorted);
    }
}
