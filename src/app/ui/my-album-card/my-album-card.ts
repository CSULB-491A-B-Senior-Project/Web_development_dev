import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-my-album-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './my-album-card.html',
  styleUrl: './my-album-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyAlbumCard {
  name = input.required<string>();
  description = input<string | undefined>()
  viewLink = input<any[] | string>(['/explore']);

}
