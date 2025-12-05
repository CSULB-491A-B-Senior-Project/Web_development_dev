import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FloatingPlayerComponent } from './ui/floating-player/floating-player.component';
import { SpotifyPlayerService } from './services/spotify-player.service';
import { ApiService } from './api.service';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet, FloatingPlayerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('crescendo');

  constructor(
    private spotifyPlayerService: SpotifyPlayerService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    if (this.apiService.isAuthenticated()) {
      this.initializeSpotifyPlayer();
    }
  }

  private initializeSpotifyPlayer(): void {
    this.apiService.get<{ accessToken: string }>('/spotify/token')
      .subscribe({
        next: (response) => {
          this.spotifyPlayerService.initializePlayer(response.accessToken);
        },
        error: (error) => {
          console.error('Failed to initialize Spotify player:', error);
        }
      });
  }
}