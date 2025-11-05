import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AlbumCard } from '../../ui/album-card/album-card';

type artist = {
    artistId: number;
    name: string;
    followers: number;
    albums: string[];
    bio: string;
    profileUrl: string;
};

type Album = {
    albumId: number;
    title: string;
    dateLabel: string;
    imageUrl: string;
};
@Component({
    selector: 'app-artist',
    templateUrl: './artist.component.html',
    styleUrls: ['./artist.component.scss'],
    imports: [RouterLink, AlbumCard, CommonModule]
})
export class ArtistComponent {
    artist_1 = {
        artistId: 999,
        name: 'Artist Name',
        followers: 9999,
        albums: ['Album 1', 'Album 2', 'Album 3'],
        bio: 'This is a sample biography of the artist. It provides some background information and interesting facts about the artist\'s career and achievements. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        profileUrl: 'https://picsum.photos/seed/artist-profile/600/600'
    };

    albums = signal<Album[]>([
    {
        albumId: 1,
        title: 'Album A',
        dateLabel: 'Oct. 20, 2025',
        imageUrl: 'https://picsum.photos/seed/card-1/600/600'
    },
    {
        albumId: 2,
        title: 'Album B',
        dateLabel: 'Oct. 21, 2025',
        imageUrl: 'https://picsum.photos/seed/card-2/600/600'
    },
    {
        albumId: 3,
        title: 'Album C',
        dateLabel: 'Oct. 22, 2025',
        imageUrl: 'https://picsum.photos/seed/card-3/600/600'
    },
    {
        albumId: 4,
        title: 'Album D',
        dateLabel: 'Oct. 23, 2025',
        imageUrl: 'https://picsum.photos/seed/card-4/600/600'
    },
    {
        albumId: 5,
        title: 'Album E',
        dateLabel: 'Oct. 24, 2025',
        imageUrl: 'https://picsum.photos/seed/card-5/600/600'
    },
    ]);

    trackById = (_: number, it: Album) => it.albumId;
}