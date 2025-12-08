import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../api.service';

@Component({
  selector: 'app-spotify-connect-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spotify-connect-modal.component.html',
  styleUrls: ['./spotify-connect-modal.component.css']
})
export class SpotifyConnectModalComponent implements OnInit, OnDestroy {
  isVisible = false;
  isLoading = false;
  errorMessage: string | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    // Listen for custom event to show modal
    window.addEventListener('show-spotify-connect-modal', this.handleShowModal);
  }

  ngOnDestroy(): void {
    window.removeEventListener('show-spotify-connect-modal', this.handleShowModal);
  }

  private handleShowModal = (): void => {
    this.show();
  };

  show(): void {
    this.isVisible = true;
    this.errorMessage = null;
  }

  hide(): void {
    this.isVisible = false;
    this.errorMessage = null;
  }

  connectSpotify(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Get the Spotify authorization URL
    this.apiService.get<{ authorizationUrl: string, state: string }>('/SpotifyAuth/authorize')
      .subscribe({
        next: (response) => {
          // Store state for validation if needed
          sessionStorage.setItem('spotify_auth_state', response.state);
          
          // Redirect to Spotify authorization
          window.location.href = response.authorizationUrl;
        },
        error: (error) => {
          console.error('Failed to get Spotify authorization URL:', error);
          this.errorMessage = 'Failed to connect to Spotify. Please try again.';
          this.isLoading = false;
        }
      });
  }

  cancel(): void {
    this.hide();
  }
}
