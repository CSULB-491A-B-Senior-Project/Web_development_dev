import { Component, OnInit, signal, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExploreCard } from '../../ui/explore-card/explore-card';
import { FeedService, FeedPost, FeedResponse } from '../../services/feed.service';
import { AccountService } from '../../services/account.service';
import { UserAccount } from '../../models/account.models';
import { Router, RouterLink } from '@angular/router';
import { ListCreateComponent } from '../list-create/list-create';
import { PlaylistCreatorService } from '../../services/playlist.service';

type Item = {
  id: string;
  username: string;
  title: string;
  genres: string[];
  dateLabel: string;
  imageUrl: string;
  isArtist: boolean;
  favorites: number;
  rating: number;
  postType: 'comment_post' | 'rating_post' | 'album_post';
  postContent?: string;
};

@Component({
  standalone: true,
  selector: 'app-explore',
  imports: [CommonModule, ExploreCard, RouterLink, ListCreateComponent],
  templateUrl: './explore.html',
  styleUrl: './explore.scss'
})
export class Explore implements OnInit {
  items = signal<Item[]>([]);
  loading = signal(true);
  loadingMore = signal(false);
  error = signal<string | null>(null);
  currentPage = signal(1);
  hasMore = signal(true);
  username: string = '';


  @ViewChild('listCreateOverlay') listCreateOverlay!: ListCreateComponent;

  
  constructor(private feedService: FeedService, private accountService: AccountService) { }
  ngOnInit() {
    this.loadFeed();
    this.accountService.getAccount().subscribe((account: UserAccount) => {
      this.username = account.username;
    }
    );
  }

  @HostListener('window:scroll')
  onScroll(): void {
    // check if we can load or if there is no more content
    if (this.loadingMore() || !this.hasMore() || this.loading()) {
      return;
    }

    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollPercentage = (scrollPosition / documentHeight) * 100;

    if (scrollPercentage >= 60) {
      this.loadMore();
    }
  }

  loadFeed(page: number = 1) {
    this.loading.set(true);
    this.error.set(null);

    this.feedService.getFeed(undefined, page, 20).subscribe({
      next: (response: FeedResponse) => {
        const mappedItems = response.data.map((post: FeedPost) => this.mapPostToItem(post));
        this.items.set(mappedItems);
        this.currentPage.set(page);
        this.hasMore.set(response.data.length === response.pageSize);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error loading feed:', err);
        this.error.set('Failed to load feed');
        this.loading.set(false);
      }
    });
  }

  loadMore(): void {
    if (this.loadingMore() || !this.hasMore()) {
      return;
    }

    this.loadingMore.set(true);
    const nextPage = this.currentPage() + 1;

    this.feedService.getFeed(undefined, nextPage, 20).subscribe({
      next: (response: FeedResponse) => {
        const mappedItems = response.data.map((post: FeedPost) => this.mapPostToItem(post));
        // Append new items to existing items
        this.items.update(current => [...current, ...mappedItems]);
        this.currentPage.set(nextPage);
        this.hasMore.set(response.data.length === response.pageSize);
        this.loadingMore.set(false);
      },
      error: (err: any) => {
        console.error('Error loading more feed items:', err);
        this.loadingMore.set(false);
      }
    });
  }

  private mapPostToItem(post: FeedPost): Item {
    // Calculate average rating from ratingCount and individual ratings
    const avgRating = post.rating ?? 0;
    const dateLabel = this.formatDate(post.createdAt);
    const isArtist = post.user == null || post.type == 'album_post';
    return {
      id: post.album.id,
      username: post.user?.username ?? post.album.artistName,
      title: post.album.title,
      genres: [],
      dateLabel,
      imageUrl: post.album.coverArt,
      isArtist,
      favorites: post.commentCount,
      rating: avgRating,
      postType: post.type
    };
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffMs / 604800000);

    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d`;
    if (diffWeeks < 4) return `${diffWeeks}w`;
    return date.toLocaleDateString();
  }

  trackById = (_: number, it: Item) => it.id;

  openPlaylistCreator(): void {
    this.listCreateOverlay?.open();
  }
}