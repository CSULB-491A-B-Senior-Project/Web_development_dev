import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FloatingPlayerComponent } from './ui/floating-player/floating-player.component';
import { SpotifyPlayerService } from './services/spotify-player.service';
import { ApiService } from './api.service';
import { SpotifyConnectModalComponent } from './ui/spotify-connect-modal/spotify-connect-modal.component';


@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet, FloatingPlayerComponent, SpotifyConnectModalComponent],
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
      this.checkSpotifyConnection();  // Changed from initializeSpotifyPlayer()
    }
  }

  private checkSpotifyConnection(): void {
    console.log("checking connection...")
    // Check if user has connected their Spotify account
    this.apiService.get<{ isConnected: boolean }>('/SpotifyAuth/status')
      .subscribe({
        next: (response) => {
          if (response.isConnected) {
            this.initializeSpotifyPlayer();
          } else {
            // User is logged into Crescendo but not Spotify
            // Show Spotify connection prompt
            this.showSpotifyConnectionPrompt();
          }
        },
        error: (error) => {
          console.error('Failed to check Spotify connection status:', error);
        }
      });
  }

  private initializeSpotifyPlayer(): void {
    // Get user's Spotify access token (NOT the client credentials token)
    this.apiService.get<{ accessToken: string, expiresIn: number }>('/SpotifyAuth/token')
      .subscribe({
        next: (response) => {
          this.spotifyPlayerService.initializePlayer(response.accessToken);
          
          // Set up token refresh before expiration
          if (response.expiresIn) {
            this.scheduleTokenRefresh(response.expiresIn);
          }
        },
        error: (error) => {
          console.error('Failed to initialize Spotify player:', error);
          
          // If 404, user needs to connect Spotify
          if (error.status === 404) {
            this.showSpotifyConnectionPrompt();
          }
        }
      });
  }

  private scheduleTokenRefresh(expiresIn: number): void {
    // Refresh token 5 minutes before expiration
    const refreshTime = (expiresIn - 300) * 1000;
    
    setTimeout(() => {
      this.refreshSpotifyToken();
    }, refreshTime);
  }

  private refreshSpotifyToken(): void {
    this.apiService.post<{ accessToken: string, expiresIn: number }>('/SpotifyAuth/refresh', {})
      .subscribe({
        next: (response) => {
          // Update the player with the new token
          this.spotifyPlayerService.updateToken(response.accessToken);
          
          // Schedule next refresh
          if (response.expiresIn) {
            this.scheduleTokenRefresh(response.expiresIn);
          }
        },
        error: (error) => {
          console.error('Failed to refresh Spotify token:', error);
          // If refresh fails, user may need to reconnect
          this.showSpotifyConnectionPrompt();
        }
      });
  }

  private showSpotifyConnectionPrompt(): void {
    // This will trigger the Spotify connection modal
    // You'll need to implement a service or use a modal library
    // For now, we'll dispatch a custom event that can be caught by a modal component
    window.dispatchEvent(new CustomEvent('show-spotify-connect-modal'));
  }
}