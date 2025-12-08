import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-explore-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './explore-card.html',
  styleUrl: './explore-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExploreCard {
  username = input.required<string>();
  title = input.required<string>();
  genres = input<string[] | undefined>(undefined);
  dateLabel = input<string>('');
  imageUrl = input<string>('/assets/placeholder.png');
  isArtist = input<boolean>(false);
  favorites = input<number>(0);
  rating = input<number>(0);
  averageRating = input<number>(0);
  viewLink = input<any[] | string>(['/explore']);
  postType = input<'comment_post' | 'rating_post' | 'album_post'>('album_post');
  postContent = input<string | undefined>(undefined);

  private readonly placeholder = '/assets/placeholder.png'; // match the default above
  usePlaceholder(ev: Event): void {
    const img = ev.target as HTMLImageElement | null;
    if (img && !img.src.endsWith(this.placeholder)) {
      img.src = this.placeholder; // avoid infinite error loop
    }
  }
  formattedFavorites = computed(() => {
    const n = this.favorites();
    if (!Number.isFinite(n)) return '0';
    if (n < 1_000) return `${n}`;
    if (n < 1_000_000) return `${Math.round(n / 100) / 10}k`;
    return `${Math.round(n / 100_000) / 10}M`;
  });

  formattedAverageRating = computed(() => {
    const rating = this.averageRating();
    return rating > 0 ? rating.toFixed(1) : '0.0';
  });

  // show up to 3 chips, then "+N more"
  visibleGenres = computed(() => (this.genres() ?? []).slice(0, 3));
  extraCount = computed(() => {
    const all = this.genres() ?? [];
    return Math.max(0, all.length - this.visibleGenres().length);
  });

  // Computed properties for post type display
  postTypeLabel = computed(() => {
    if (this.isArtist()) {
      return 'artist';
    }
    const type = this.postType();
    switch (type) {
      case 'comment_post':
        return 'commented on';
      case 'rating_post':
        return 'rated';
      case 'album_post':
        return 'album';
      default:
        return '';
    }
  });

  postTypeIcon = computed(() => {
    if (this.isArtist()) {
      return 'artist';
    }
    const type = this.postType();
    switch (type) {
      case 'comment_post':
        return 'comment';
      case 'rating_post':
        return 'star';
      case 'album_post':
        return 'album';
      default:
        return '';
    }
  });
  badgeClass = computed(() => {
    if (this.isArtist()) return 'badge-artist_post';
    return `badge-${this.postType()}`;
  });
  showPostContent = computed(() => {
    return this.postType() === 'comment_post' && this.postContent();
  });
}
