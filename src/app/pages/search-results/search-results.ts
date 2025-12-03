import { ChangeDetectionStrategy, Component, effect, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ExploreCard } from '../../ui/explore-card/explore-card';
import { SearchService, SearchItem } from '../../services/search.service';
import { debounceTime, switchMap, catchError } from 'rxjs/operators';
import { Subject, of, Subscription } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-search-results',
  imports: [CommonModule, FormsModule, RouterLink, ExploreCard],
  templateUrl: './search-results.html',
  styleUrl: './search-results.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchResults implements OnDestroy {
  // UI state signals
  query = signal('');
  view = signal<'grid' | 'list'>('grid');
  tab = signal<'all' | 'users' | 'albums' | 'reviews' | 'artists'>('all');
  sort = signal<'relevance' | 'recent' | 'popular' | 'rating'>('relevance');

  // Data state signals
  items = signal<SearchItem[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  resultCount = signal(0);

  // Search trigger subject
  private searchSubject = new Subject<void>();
  private subscription?: Subscription;

  constructor(
    private searchService: SearchService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.initializeFromUrl();
    this.setupSearch();
    this.setupAutoSearch();
  }

  private initializeFromUrl(): void {
    this.route.queryParams.subscribe(params => {
      if (params['q']) {
        this.query.set(params['q']);
      }
      if (params['tab'] && ['all', 'users', 'albums', 'reviews', 'artists'].includes(params['tab'])) {
        this.tab.set(params['tab']);
      }
      if (params['view'] && ['grid', 'list'].includes(params['view'])) {
        this.view.set(params['view']);
      }
      if (params['sort'] && ['relevance', 'recent', 'popular', 'rating'].includes(params['sort'])) {
        this.sort.set(params['sort']);
      }
    });
  }

  private setupSearch(): void {
    this.subscription = this.searchSubject.pipe(
      debounceTime(300),
      switchMap(() => {
        const q = this.query().trim();

        // If no query, clear results
        if (!q) {
          return of({ items: [], total: 0 });
        }

        // Set loading state
        this.loading.set(true);
        this.error.set(null);

        // Execute search
        return this.searchService.search({
          query: q,
          tab: this.tab(),
          sort: this.sort()
        }).pipe(
          catchError((err) => {
            console.error('Search error:', err);
            this.error.set('Failed to load search results. Please try again.');
            this.loading.set(false);
            return of({ items: [], total: 0 });
          })
        );
      })
    ).subscribe({
      next: (response) => {
        this.items.set(response.items);
        this.resultCount.set(response.total);
        this.loading.set(false);
      }
    });
  }

  private setupAutoSearch(): void {
    // Trigger search when query, tab, or sort changes
    effect(() => {
      const q = this.query();
      const t = this.tab();
      const s = this.sort();
      const v = this.view();

      // Update URL with current search state
      this.updateUrl(q, t, s, v);

      // Trigger search if we have a query
      if (q.trim()) {
        this.searchSubject.next();
      } else {
        // Clear results if no query
        this.items.set([]);
        this.resultCount.set(0);
        this.loading.set(false);
      }
    });
  }

  private updateUrl(query: string, tab: string, sort: string, view: string): void {
    const queryParams: any = {};

    if (query) queryParams['q'] = query;
    if (tab !== 'all') queryParams['tab'] = tab;
    if (sort !== 'relevance') queryParams['sort'] = sort;
    if (view !== 'grid') queryParams['view'] = view;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true
    });
  }

  // Public methods for template
  setTab(t: 'all' | 'users' | 'albums' | 'reviews' | 'artists'): void {
    this.tab.set(t);
  }

  setView(v: 'grid' | 'list'): void {
    this.view.set(v);
  }

  retrySearch(): void {
    this.searchSubject.next();
  }

  // Getter/setter for ngModel two-way binding with signals
  get sortValue(): 'relevance' | 'recent' | 'popular' | 'rating' {
    return this.sort();
  }

  set sortValue(value: 'relevance' | 'recent' | 'popular' | 'rating') {
    this.sort.set(value);
  }

  // TrackBy function for ngFor optimization (IDs are now strings)
  trackById = (_index: number, item: SearchItem): string => item.id;

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
