import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  type: 'user' | 'album' | 'review';
};

@Component({
  standalone: true,
  selector: 'app-search-results',
  imports: [CommonModule, FormsModule, RouterLink, ExploreCard],
  templateUrl: './search-results.html',
  styleUrl: './search-results.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchResults {
  // UI state
  query = signal('');
  view = signal<'grid' | 'list'>('grid');
  tab = signal<'all' | 'users' | 'albums' | 'reviews'>('all');
  sort = signal<'relevance' | 'recent' | 'popular' | 'rating'>('relevance');

  // Fake data (replace with backend later)
  private readonly allItems = signal<Item[]>([
    {
      id: 101,
      username: 'aurora',
      title: 'Midnight Echoes',
      genres: ['ambient', 'electronic'],
      dateLabel: 'Today',
      imageUrl: 'https://picsum.photos/seed/sr-1/600/600',
      isArtist: true,
      favorites: 3400,
      rating: 4.6,
      type: 'album'
    },
    {
      id: 102,
      username: 'miles',
      title: 'Lo-Fi Study Session',
      genres: ['lofi', 'hip-hop'],
      dateLabel: '2d',
      imageUrl: 'https://picsum.photos/seed/sr-2/600/600',
      isArtist: false,
      favorites: 820,
      rating: 3.9,
      type: 'review'
    },
    {
      id: 103,
      username: 'cassette_club',
      title: 'Analog Dreams',
      genres: ['indie', 'pop'],
      dateLabel: '1w',
      imageUrl: 'https://picsum.photos/seed/sr-3/600/600',
      isArtist: true,
      favorites: 15400,
      rating: 4.9,
      type: 'album'
    },
    {
      id: 104,
      username: 'noisewave',
      title: 'noisewave',
      genres: ['electronic'],
      dateLabel: 'Yesterday',
      imageUrl: 'https://picsum.photos/seed/sr-4/600/600',
      isArtist: false,
      favorites: 260,
      rating: 0,
      type: 'user'
    }
  ]);

  // Filtering & sorting
  filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    const tab = this.tab();
    const sort = this.sort();

    let list = this.allItems();

    if (tab !== 'all') {
      list = list.filter(i =>
        (tab === 'reviews' && i.type === 'review') ||
        (tab === 'users' && i.type === 'user') ||
        (tab === 'albums' && i.type === 'album')
      );
    }

    if (q) {
      list = list.filter(i =>
        i.username.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q) ||
        i.genres.some(g => g.toLowerCase().includes(q))
      );
    }

    switch (sort) {
      case 'recent':
        // naive mock ordering
        return list.slice().sort((a, b) => a.dateLabel.localeCompare(b.dateLabel));
      case 'popular':
        return list.slice().sort((a, b) => b.favorites - a.favorites);
      case 'rating':
        return list.slice().sort((a, b) => b.rating - a.rating);
      default:
        return list; // relevance from backend later
    }
  });

  resultCount = computed(() => this.filtered().length);

  setTab(t: 'all' | 'users' | 'albums' | 'reviews') { this.tab.set(t); }
  setView(v: 'grid' | 'list') { this.view.set(v); }

  // trackBy to satisfy Angular typing
  trackById = (_: number, it: Item) => it.id;
}
