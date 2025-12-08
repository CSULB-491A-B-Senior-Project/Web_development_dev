import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../api.service';

@Component({
  selector: 'app-spotify-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spotify-callback.component.html',
  styleUrls: ['./spotify-callback.component.css']
})
export class SpotifyCallbackComponent implements OnInit {
  status: 'processing' | 'success' | 'error' = 'processing';
  message = 'Connecting your Spotify account...';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    // Get the authorization code from URL query parameters
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const state = params['state'];
      const error = params['error'];

      if (error) {
        this.handleError(`Spotify authorization failed: ${error}`);
        return;
      }

      if (!code) {
        this.handleError('No authorization code received from Spotify');
        return;
      }

      // Validate state if you stored it
      const storedState = sessionStorage.getItem('spotify_auth_state');
      if (storedState && state !== storedState) {
        this.handleError('State validation failed. Possible security issue.');
        return;
      }

      // Exchange the code for tokens
      this.exchangeCodeForTokens(code, state);
    });
  }

  private exchangeCodeForTokens(code: string, state?: string): void {
    const requestBody: any = { code };
    if (state) {
      requestBody.state = state;
    }

    this.apiService.post<{ success: boolean, message: string }>('/SpotifyAuth/callback', requestBody)
      .subscribe({
        next: (response) => {
          this.status = 'success';
          this.message = 'Spotify account connected successfully!';
          
          // Clean up stored state
          sessionStorage.removeItem('spotify_auth_state');
          
          // Redirect to home page after 2 seconds
          setTimeout(() => {
            // Reload to reinitialize the player
            window.location.href = '/';
          }, 2000);
        },
        error: (error) => {
          console.error('Failed to exchange code for tokens:', error);
          this.handleError(error.error?.message || 'Failed to connect Spotify account');
        }
      });
  }

  private handleError(errorMessage: string): void {
    this.status = 'error';
    this.message = errorMessage;
    
    // Redirect to home after 5 seconds
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 5000);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
