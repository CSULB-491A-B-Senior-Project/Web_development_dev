import {
  ChangeDetectionStrategy,
  Component,
  effect,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, switchMap, catchError } from 'rxjs/operators';

import {
  SearchService,
  SearchItem,
  SearchCategory,
  SearchParams,
} from '../../services/search.service';
import { ExploreCard } from '../../ui/explore-card/explore-card';
import { UserCard } from '../../ui/user-card/user-card';
import { PostCard } from '../../ui/post-card/post-card';

@Component({
  standalone: true,
  selector: 'app-search-results',
  imports: [CommonModule, FormsModule, RouterLink, ExploreCard, UserCard, PostCard],
  templateUrl: './search-results.html',
  styleUrl: './search-results.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchResults implements OnDestroy {
  // UI state signals
  readonly query = signal('');
  readonly view = signal<'grid' | 'list'>('grid');
  readonly tab = signal<'all' | 'users' | 'albums' | 'reviews' | 'artists'>('all');
  readonly sort = signal<'relevance' | 'alpha' | 'date'>('relevance');
  // Pagination
  readonly currentPage = signal(1);
  readonly pageSize = 20;

  // Raw data state signals (unsorted)
  private readonly rawCategories = signal<SearchCategory[]>([]);
  private readonly rawItems = signal<SearchItem[]>([]);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly resultCount = signal(0);

  // Sorted/computed data
  readonly categories = computed(() => this.sortCategories(this.rawCategories()));
  readonly items = computed(() => this.sortItems(this.rawItems()));

  // Search trigger
  private readonly searchSubject = new Subject<void>();
  private subscription?: Subscription;

  constructor(
    private readonly searchService: SearchService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    this.initializeFromUrl();
    this.setupSearch();
    this.setupAutoSearch();
  }

  // sort logic

  private sortItems(items: SearchItem[]): SearchItem[] {
    const sorted = [...items];
    const sortType = this.sort();

    switch (sortType) {
      case 'alpha':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));

      case 'date':
        return sorted.sort((a, b) => {
          // For albums, sort by release date (newest first)
          if (a.dateLabel && b.dateLabel) {
            return b.dateLabel.localeCompare(a.dateLabel);
          }
          return 0;
        });

      case 'relevance':
      default:
        return sorted; // Keep original order from API (relevance)
    }
  }

  private sortCategories(categories: SearchCategory[]): SearchCategory[] {
    return categories.map(cat => ({
      ...cat,
      items: this.sortItems(cat.items)
    }));
  }

  // --- Init / URL sync -------------------------------------------------------

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
      if (params['sort'] && ['relevance', 'alpha', 'date'].includes(params['sort'])) {
        this.sort.set(params['sort']);
      }
      if (params['page']) {
        this.currentPage.set(parseInt(params['page'], 10) || 1);
      }
    });
  }

  private setupSearch(): void {
    this.subscription = this.searchSubject
      .pipe(
        debounceTime(300),
        switchMap(() => {
          const q = this.query().trim();

          if (!q) {
            this.loading.set(false);
            this.rawCategories.set([]);
            this.rawItems.set([]);
            this.resultCount.set(0);
            return of(null);
          }

          this.loading.set(true);
          this.error.set(null);

          const params: SearchParams = {
            query: q,
            tab: this.tab(),
            page: this.currentPage(),
            pageSize: this.pageSize,
          };

          return this.searchService
            .searchCategorized(params)
            .pipe(catchError(err => this.handleError(err)));
        }),
      )
      .subscribe(response => {
        if (!response) {
          return;
        }

        this.rawCategories.set(response.categories || []);

        const allItems = (response.categories || []).flatMap(
          (cat: SearchCategory) => cat.items,
        );

        this.rawItems.set(allItems);
        this.resultCount.set(response.totalResults || 0);
        this.loading.set(false);
      });
  }

  private handleError(err: unknown) {
    console.error('Search error:', err);
    this.error.set('Failed to load search results. Please try again.');
    this.loading.set(false);
    return of({ categories: [], totalResults: 0 });
  }

  private setupAutoSearch(): void {
    // Trigger search + keep URL in sync whenever state changes
    effect(() => {
      const q = this.query();
      const t = this.tab();
      const v = this.view();
      const p = this.currentPage();

      this.updateUrl(q, t, v, p);

      if (q.trim()) {
        this.searchSubject.next();
      } else {
        this.rawCategories.set([]);
        this.rawItems.set([]);
        this.resultCount.set(0);
        this.loading.set(false);
      }
    });
  }

  private updateUrl(
    query: string,
    tab: string,
    view: string,
    page: number,
  ): void {
    const queryParams: any = {};

    if (query) queryParams['q'] = query;
    if (tab !== 'all') queryParams['tab'] = tab;
    if (view !== 'grid') queryParams['view'] = view;
    if (page !== 1) queryParams['page'] = page.toString();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
    });
  }

  // --- Public methods used in the template ----------------------------------

  setTab(tab: 'all' | 'users' | 'albums' | 'reviews' | 'artists'): void {
    this.tab.set(tab);
    this.currentPage.set(1);
  }

  setView(view: 'grid' | 'list'): void {
    this.view.set(view);
  }

  retrySearch(): void {
    this.searchSubject.next();
  }

  nextPage(): void {
    this.currentPage.update(p => p + 1);
  }

  previousPage(): void {
    this.currentPage.update(p => Math.max(1, p - 1));
  }

  totalPages = () => Math.ceil(this.resultCount() / this.pageSize);
  hasMorePages = () => this.currentPage() < this.totalPages();

  // ngModel bridge
  get sortValue(): 'relevance' | 'alpha' | 'date' {
    return this.sort();
  }

  set sortValue(value: 'relevance' | 'alpha' | 'date') {
    this.sort.set(value);
  }

  // TrackBy
  trackById = (_index: number, item: SearchItem): string => item.id;

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
