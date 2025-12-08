import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-post-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './post-card.html',
  styleUrl: './post-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostCard {
  @Input() postType = '';
  @Input() username = '';
  @Input() albumId = '';
  @Input() albumTitle = '';
  @Input() artistName = '';
  @Input() albumCover = '';
  @Input() commentText = '';
  @Input() ratingValue = 0;
  @Input() createdAt?: string | Date;

  stars = Array.from({ length: 5 });

  get postTypeLabel(): string {
    if (!this.postType) return 'Post';
    const first = this.postType[0]?.toUpperCase() ?? '';
    return first + this.postType.slice(1);
  }
}
