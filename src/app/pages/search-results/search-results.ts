import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ExploreCard } from '../../ui/explore-card/explore-card';
import { SearchService, SearchItem } from '../../services/search.service';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Subject } from 'rxjs';

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


  // Data state
  items = signal<SearchItem[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  resultCount = signal(0);

  searchSubject = new Subject<void>();

  constructor(
    private searchService: SearchService,
    private route: ActivatedRoute
  ) {
    // Read query from URL on init
    this.route.queryParams.subscribe(params => {
      if (params['q']) {
        this.query.set(params['q']);
      }
    });

    // Set up debounced search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(() => {
        this.loading.set(true);
        this.error.set(null);

        return this.searchService.search({
          query: this.query(),
          tab: this.tab(),
          sort: this.sort()
        });
      })
    ).subscribe({
      next: (response) => {
        this.items.set(response.items);
        this.resultCount.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load search results');
        this.loading.set(false);
        console.error('Search error:', err);
      }
    });

    // Trigger search when query, tab, or sort changes
    effect(() => {
      const q = this.query();
      const t = this.tab();
      const s = this.sort();

      if (q.trim()) {
        this.searchSubject.next();
      } else {
        this.items.set([]);
        this.resultCount.set(0);
      }
    });
  }

  setTab(t: 'all' | 'users' | 'albums' | 'reviews') {
    this.tab.set(t);
  }

  setView(v: 'grid' | 'list') {
    this.view.set(v);
  }

  trackById = (_: number, it: SearchItem) => it.id;
}

 /* // Filtering & sorting
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
*/
