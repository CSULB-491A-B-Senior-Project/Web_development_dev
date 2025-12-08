import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SpotifyPlayerService } from '../../services/spotify-player.service';
import { ApiService } from '../../api.service';
import { Navbar } from '../../ui/navbar/navbar';

@Component({
  selector: 'app-main-layout',
  imports: [ CommonModule, RouterOutlet, Navbar ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayout implements OnInit, OnDestroy {
  private tokenRefreshTimer?: number;

  constructor(
    private spotifyPlayerService: SpotifyPlayerService,
    private apiService: ApiService
  ) { }

  ngOnInit(): void {
    console.log('═══════════════════════════════════════');
    console.log('🏠 MAIN LAYOUT INITIALIZED');
    console.log('═══════════════════════════════════════');

    // Initialize Spotify player for all protected routes
    if (this.apiService.isAuthenticated()) {
      console.log('✓ User is authenticated, checking Spotify connection...');
      this.checkSpotifyConnection();
    } else {
      console.log('✗ User is not authenticated in MainLayout (this should never happen)');
    }

    // Listen for auth errors from the player
    window.addEventListener('spotify-auth-error', this.handleAuthError);

    console.log('═══════════════════════════════════════');
  }

  ngOnDestroy(): void {
    // Clean up
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }
    window.removeEventListener('spotify-auth-error', this.handleAuthError);
  }

  private handleAuthError = (): void => {
    console.warn('⚠️ Spotify auth error detected, attempting to refresh token...');
    this.refreshSpotifyToken();
  };

  private checkSpotifyConnection(): void {
    console.log("Checking Spotify connection status...");

    this.apiService.get<{ isConnected: boolean }>('/SpotifyAuth/status')
      .subscribe({
        next: (response) => {
          console.log('Spotify connection status:', response);
          if (response.isConnected) {
            console.log('✓ Spotify is connected, initializing player...');
            this.initializeSpotifyPlayer();
          } else {
            console.log('✗ Spotify not connected, showing connection prompt');
            this.showSpotifyConnectionPrompt();
          }
        },
        error: (error) => {
          console.error('Failed to check Spotify connection status:', error);
          // Still try to initialize - token might be available
          this.initializeSpotifyPlayer();
        }
      });
  }

  private initializeSpotifyPlayer(): void {
    console.log('Requesting Spotify access token...');

    this.apiService.get<{ accessToken: string, expiresIn: number }>('/SpotifyAuth/token')
      .subscribe({
        next: (response) => {
          console.log('✓ Received Spotify access token, expires in:', response.expiresIn, 'seconds');
          console.log('Initializing Spotify Player SDK...');

          this.spotifyPlayerService.initializePlayer(response.accessToken);

          // Set up token refresh before expiration
          if (response.expiresIn) {
            this.scheduleTokenRefresh(response.expiresIn);
          }
        },
        error: (error) => {
          console.error('✗ Failed to initialize Spotify player:', error);

          // If 404, user needs to connect Spotify
          if (error.status === 404) {
            console.log('Token not found - user needs to connect Spotify');
            this.showSpotifyConnectionPrompt();
          }
        }
      });
  }

  private scheduleTokenRefresh(expiresIn: number): void {
    // Refresh token 5 minutes before expiration
    const refreshTime = (expiresIn - 300) * 1000;

    console.log(`Scheduling token refresh in ${refreshTime / 1000} seconds`);

    // Clear any existing timer
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    this.tokenRefreshTimer = window.setTimeout(() => {
      console.log('Token refresh time reached');
      this.refreshSpotifyToken();
    }, refreshTime);
  }

  private refreshSpotifyToken(): void {
    console.log('Refreshing Spotify token...');

    this.apiService.post<{ accessToken: string, expiresIn: number }>('/SpotifyAuth/refresh', {})
      .subscribe({
        next: (response) => {
          console.log('✓ Token refreshed successfully, expires in:', response.expiresIn, 'seconds');

          // Update the player with the new token
          this.spotifyPlayerService.updateToken(response.accessToken);

          // Schedule next refresh
          if (response.expiresIn) {
            this.scheduleTokenRefresh(response.expiresIn);
          }
        },
        error: (error) => {
          console.error('✗ Failed to refresh Spotify token:', error);
          // If refresh fails, user may need to reconnect
          this.showSpotifyConnectionPrompt();
        }
      });
  }

  private showSpotifyConnectionPrompt(): void {
    console.log('Showing Spotify connection prompt');
    window.dispatchEvent(new CustomEvent('show-spotify-connect-modal'));
  }
}
