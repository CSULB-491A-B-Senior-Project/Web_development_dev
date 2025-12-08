import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: any;
  }
}

export interface PlayerState {
  trackName: string;
  artistName: string;
  albumName: string;
  albumArt: string;
  isPlaying: boolean;
  duration: number;
  position: number;
  isPremium: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SpotifyPlayerService {
  private player: any;
  private deviceId: string | null = null;
  private playerState = new BehaviorSubject<PlayerState | null>(null);
  private currentAccessToken: string | null = null;

  public playerState$ = this.playerState.asObservable();

  constructor() { }

  initializePlayer(accessToken: string): void {
    this.currentAccessToken = accessToken;
    
    // Check if SDK is already loaded
    if (window.Spotify) {
      this.createPlayer();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.type = 'text/javascript';
    script.addEventListener('load', () => {
      console.log('Spotify SDK loaded');
    });
    document.head.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      this.createPlayer();
    };
  }

  private createPlayer(): void {
    if (!this.currentAccessToken) {
      console.error('No access token available');
      return;
    }

    this.player = new window.Spotify.Player({
      name: 'Crescendo Web Player',
      getOAuthToken: (cb: (token: string) => void) => {
        cb(this.currentAccessToken!);
      },
      volume: 0.5
    });

    this.addPlayerListeners();

    this.player.connect().then((success: boolean) => {
      if (success) {
        console.log('The Spotify player has been connected successfully!');
      }
    });
  }

  updateToken(newAccessToken: string): void {
    this.currentAccessToken = newAccessToken;
    
    // If player exists, we need to update its token
    // The Spotify SDK will call getOAuthToken when it needs a token
    // So we just need to update our stored token
    console.log('Spotify access token updated');
  }

  private addPlayerListeners(): void {
    this.player.addListener('ready', ({ device_id }: { device_id: string }) => {
      console.log('Ready with Device ID', device_id);
      this.deviceId = device_id;
    });

    this.player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
      console.log('Device ID has gone offline', device_id);
    });

    this.player.addListener('player_state_changed', (state: any) => {
      if (!state) {
        return;
      }

      const currentTrack = state.track_window.current_track;
      const playerState: PlayerState = {
        trackName: currentTrack.name,
        artistName: currentTrack.artists.map((artist: any) => artist.name).join(', '),
        albumName: currentTrack.album.name,
        albumArt: currentTrack.album.images[0].url,
        isPlaying: !state.paused,
        duration: state.duration,
        position: state.position,
        isPremium: state.restrictions.disallow_pausing_reasons?.[0] === 'premium_required' || state.restrictions.disallow_seeking_reasons?.[0] === 'premium_required'
      };

      this.playerState.next(playerState);
    });

    this.player.addListener('authentication_error', ({ message }: { message: string }) => {
      console.error('Authentication error:', message);
      // Token may have expired, trigger refresh in app component
      window.dispatchEvent(new CustomEvent('spotify-auth-error'));
    });
  }

  play(spotify_uri: string): void {
    if (!this.deviceId) {
        console.error('Device ID is not available yet.');
        return;
    }

    if (!this.currentAccessToken) {
        console.error('No access token available.');
        return;
    }

    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
      method: 'PUT',
      body: JSON.stringify({ uris: [spotify_uri] }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.currentAccessToken}`
      },
    }).catch(error => {
      console.error('Error playing track:', error);
    });
  }

  togglePlay(): void {
    this.player.togglePlay();
  }

  seek(position_ms: number): void {
    this.player.seek(position_ms);
  }

  setVolume(volume: number): void {
    this.player.setVolume(volume);
  }

  disconnect(): void {
    if (this.player) {
      this.player.disconnect();
    }
  }
}

