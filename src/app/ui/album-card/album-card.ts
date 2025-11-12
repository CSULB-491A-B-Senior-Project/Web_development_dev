import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-album-card',
  imports: [CommonModule],
  templateUrl: './album-card.html',
  styleUrl: './album-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlbumCard {
  title = input.required<string>();
  artist = input.required<string>();
  genres = input<string[] | undefined>(undefined);
  dateLabel = input<string>('');
  imageUrl = input<string>('/assets/placeholder.png');

  private readonly placeholder = '/assets/placeholder.png'; // match the default above
  usePlaceholder(ev: Event): void {
    const img = ev.target as HTMLImageElement | null;
    if (img && !img.src.endsWith(this.placeholder)) {
      img.src = this.placeholder; // avoid infinite error loop
    }
  };

  // show up to 3 chips, then "+N more"
  visibleGenres = computed(() => (this.genres() ?? []).slice(0, 3));
  extraCount = computed(() => {
    const all = this.genres() ?? [];
    return Math.max(0, all.length - this.visibleGenres().length);
  });
}
