import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { take } from 'rxjs';
import { PlaylistService } from '../../services/playlist.service';
import { AccountService } from '../../services/account.service';
import { UserAccount } from '../../models/account.models';

interface TrackItem {
  id: string;
  name: string;
  trackNumber: number;
  duration: string;
}

@Component({
  selector: 'app-my-album-details',
  templateUrl: './my-album-details.component.html',
  styleUrl: './my-album-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
})
export class MyAlbumDetailsComponent {
  // Album header
  title = signal<string>("Album Name");
  user = signal<string>("Username");
  description = signal<string>("");

  // Tracklist
  tracks = signal<TrackItem[]>([]);

  // Backend
  albumId = signal<string>('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private playlistService: PlaylistService,
    private accountService: AccountService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.albumId.set(id);

    const nav = this.router.getCurrentNavigation();
    const state = (nav?.extras?.state || history.state) as {
      title: string;
      description?: string;
    } | undefined;

    if (state?.title) this.title.set(state.title);

    if (!id) {
      console.warn('No album ID provided');
      return;
    }

    this.loadAlbum(id);
    this.loadUser();
  }

  // ================ Album Loading ================
  private loadUser(): void {
    this.accountService.getAccount().subscribe({
      next: (user: UserAccount) => {
        this.user.set(user.username);
        console.log('Loaded user:', user);
      },
      error: (err) => {
        console.error('Failed to load user:', err);
      }
    })
  }
  
  private loadAlbum(playlistId: string): void {
    this.playlistService.getPlaylistTracks(playlistId).pipe(take(1)).subscribe({
      next: (list: any[]) => {
        if (!Array.isArray(list) || list.length === 0) {
          this.tracks.set([]);
          return;
        }

        // Map API tracks -> TrackItem for template
        const mapped: TrackItem[] = list.map((t) => ({
          id: t.id,
          name: t.name,
          trackNumber: t.trackNumber,
          duration: this.formatSeconds(t.duration ?? 0),
        }));

        this.tracks.set(mapped);
        console.log('Tracks loaded:', mapped);
      },
      error: (err) => {
        console.error('Failed to load album:', err);
      }
    });
  }

  private formatSeconds(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }
}