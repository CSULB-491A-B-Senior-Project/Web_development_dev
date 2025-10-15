import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExploreCard } from '../../ui/explore-card/explore-card';

type Item = {
  id: number;
  username: string;
  title: string;
  genres: string[];
  dateLabel: string;
  imageUrl: string;
  isArtist: boolean;
  favorites: number;
  rating: number;
};

@Component({
  standalone: true,
  selector: 'app-explore',
  imports: [CommonModule, ExploreCard],
  templateUrl: './explore.html',
  styleUrl: './explore.scss'
})
export class Explore {
  items = signal<Item[]>([
    {
      id: 1,
      username: 'username',
      title: 'Title',
      genres: ['hip-hop', 'lofi', 'indie', 'pop'],
      dateLabel: 'Today',
      imageUrl: 'https://picsum.photos/seed/card-1/600/600',
      isArtist: true,
      favorites: 1300,
      rating: 4.5
    },
    {
      id: 2,
      username: 'another_user',
      title: 'Another Title',
      genres: ['ambient', 'electronic'],
      dateLabel: 'Yesterday',
      imageUrl: 'https://picsum.photos/seed/card-2/600/600',
      isArtist: false,
      favorites: 24500,
      rating: 4.2
    }
  ]);

  trackById = (_: number, it: Item) => it.id;
}
