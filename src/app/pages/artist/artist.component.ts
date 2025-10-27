import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AlbumCard } from '../../ui/album-card/album-card';

type Item = {
    id: number;
    title: string;
    genres: string[];
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
    items = signal<Item[]>([
    {
        id: 1,
        title: 'Title',
        genres: ['hip-hop', 'lofi', 'indie', 'pop'],
        dateLabel: 'Today',
        imageUrl: 'https://picsum.photos/seed/card-1/600/600'
    },
    {
        id: 2,
        title: 'Title',
        genres: ['ambient', 'electronic'],
        dateLabel: 'Yesterday',
        imageUrl: 'https://picsum.photos/seed/card-2/600/600'
    },
    {
        id: 3,
        title: 'Title',
        genres: ['ambient', 'electronic', 'metal'],
        dateLabel: '2d',
        imageUrl: 'https://picsum.photos/seed/card-3/600/600'
    },
    {
        id: 4,
        title: 'Title',
        genres: ['rap'],
        dateLabel: '1w',
        imageUrl: 'https://picsum.photos/seed/card-4/600/600'
    },
    {
        id: 5,
        title: 'Title',
        genres: ['ambient', 'edm'],
        dateLabel: '11w',
        imageUrl: 'https://picsum.photos/seed/card-5/600/600'
    },
    ]);

    trackById = (_: number, it: Item) => it.id;
}