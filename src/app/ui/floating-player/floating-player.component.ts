import { Component, OnInit, OnDestroy } from '@angular/core';
import { SpotifyPlayerService, PlayerState } from '../../services/spotify-player.service';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommonModule, AsyncPipe } from '@angular/common';


@Component({
  selector: 'app-floating-player',
  templateUrl: './floating-player.component.html',
    imports: [CommonModule, AsyncPipe, DragDropModule],
  styleUrls: ['./floating-player.component.css']
})

export class FloatingPlayerComponent implements OnInit, OnDestroy {
  playerState$: Observable<PlayerState | null>;
  isMinimized = false;
  isVisible = false;
  
  private destroy$ = new Subject<void>();

  constructor(private spotifyPlayer: SpotifyPlayerService) {
    this.playerState$ = this.spotifyPlayer.playerState$;
  }

  ngOnInit(): void {
    this.playerState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        if (state && !this.isVisible) {
          this.isVisible = true;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  togglePlay(): void {
    this.spotifyPlayer.togglePlay();
  }

  seek(event: any): void {
    this.spotifyPlayer.seek(event.target.value);
  }

  setVolume(event: any): void {
    this.spotifyPlayer.setVolume(event.target.value);
  }

  toggleMinimize(): void {
    this.isMinimized = !this.isMinimized;
  }

  close(): void {
    this.isVisible = false;
  }

  formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
