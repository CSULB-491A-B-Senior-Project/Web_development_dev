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
  private deviceReady = new BehaviorSubject<boolean>(false);
  private pendingPlayRequests: string[] = [];

  public playerState$ = this.playerState.asObservable();
  public deviceReady$ = this.deviceReady.asObservable();

  constructor() {
    console.log('SpotifyPlayerService created');
  }

  initializePlayer(accessToken: string): void {
    console.log('initializePlayer called with token');
    this.currentAccessToken = accessToken;

    // Check if SDK is already loaded
    if (window.Spotify) {
      console.log('Spotify SDK already loaded, creating player immediately');
      this.createPlayer();
      return;
    }

    console.log('Loading Spotify SDK script...');
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.type = 'text/javascript';
    script.addEventListener('load', () => {
      console.log('✓ Spotify SDK script loaded');
    });
    script.addEventListener('error', (error) => {
      console.error('✗ Failed to load Spotify SDK script:', error);
    });
    document.head.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log('✓ Spotify Web Playback SDK Ready callback triggered');
      this.createPlayer();
    };
  }

  private createPlayer(): void {
    if (!this.currentAccessToken) {
      console.error('✗ No access token available for player creation');
      return;
    }

    console.log('Creating Spotify Player instance...');

    this.player = new window.Spotify.Player({
      name: 'Crescendo Web Player',
      getOAuthToken: (cb: (token: string) => void) => {
        console.log('Player requesting OAuth token');
        cb(this.currentAccessToken!);
      },
      volume: 0.5
    });

    this.addPlayerListeners();

    console.log('Connecting player...');
    this.player.connect().then((success: boolean) => {
      if (success) {
        console.log('✓ The Spotify player has been connected successfully!');
      } else {
        console.error('✗ Failed to connect Spotify player');
      }
    });
  }

  updateToken(newAccessToken: string): void {
    this.currentAccessToken = newAccessToken;
    console.log('✓ Spotify access token updated');
  }

  private addPlayerListeners(): void {
    this.player.addListener('ready', ({ device_id }: { device_id: string }) => {
      console.log('✓✓✓ Ready with Device ID:', device_id);
      this.deviceId = device_id;
      this.deviceReady.next(true);

      // Process any pending play requests
      if (this.pendingPlayRequests.length > 0) {
        console.log(`📝 Processing ${this.pendingPlayRequests.length} pending play request(s)`);
        const nextTrack = this.pendingPlayRequests.pop();
        this.pendingPlayRequests = []; // Clear the rest
        if (nextTrack) {
          console.log('▶️ Auto-playing queued track:', nextTrack);
          this.play(nextTrack);
        }
      }
    });

    this.player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
      console.log('Device ID has gone offline:', device_id);
      this.deviceReady.next(false);
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
      console.error('✗ Authentication error:', message);
      // Token may have expired, trigger refresh in app component
      window.dispatchEvent(new CustomEvent('spotify-auth-error'));
    });
  }

  async play(spotify_uri: string): Promise<void> {
    if (!this.deviceId) {
      console.warn('⏳ Device ID is not available yet. Queueing track...');
      this.pendingPlayRequests.push(spotify_uri);
      console.log(`📝 Queued: ${spotify_uri} (${this.pendingPlayRequests.length} in queue)`);
      return;
    }

    if (!this.currentAccessToken) {
      console.error('✗ No access token available.');
      return;
    }

    console.log('▶️ Playing track on device:', this.deviceId);

    try {
      // First, try to transfer playback to our device
      const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        body: JSON.stringify({
          device_ids: [this.deviceId],
          play: false  // Don't start playing yet
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.currentAccessToken}`
        }
      });

      if (transferResponse.ok || transferResponse.status === 202) {
        console.log('✓ Device activated');

        // Small delay to let Spotify register the device
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        console.warn('Device transfer returned:', transferResponse.status);
      }

      // Now try to play the track
      const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: [spotify_uri] }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.currentAccessToken}`
        }
      });

      if (!playResponse.ok) {
        const errorText = await playResponse.text();
        console.error('✗ Play request failed:', playResponse.status, errorText);

        // If still 404, try using the SDK's resume method instead
        if (playResponse.status === 404 && this.player) {
          console.log('Trying SDK resume as fallback...');
          this.player.resume().then(() => {
            console.log('✓ SDK resume successful');
          }).catch((err: any) => {
            console.error('✗ SDK resume failed:', err);
          });
        }
      } else {
        console.log('✓ Play request successful');
      }
    } catch (error) {
      console.error('✗ Error playing track:', error);
    }
  }

  togglePlay(): void {
    if (this.player) {
      this.player.togglePlay();
    }
  }

  seek(position_ms: number): void {
    if (this.player) {
      this.player.seek(position_ms);
    }
  }

  setVolume(volume: number): void {
    if (this.player) {
      this.player.setVolume(volume);
    }
  }

  disconnect(): void {
    if (this.player) {
      this.player.disconnect();
    }
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }

  isReady(): boolean {
    return this.deviceReady.value;
  }
}
