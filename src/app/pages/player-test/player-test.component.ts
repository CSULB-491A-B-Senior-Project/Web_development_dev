import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyPlayerService } from '../../services/spotify-player.service';

@Component({
  standalone: true,
  selector: 'app-player-test',
  imports: [CommonModule],
  templateUrl: './player-test.component.html',
  styleUrls: ['./player-test.component.css']
})


export class PlayerTestComponent {
  playerState$;

  constructor(public spotifyPlayer: SpotifyPlayerService) {
    this.playerState$ = this.spotifyPlayer.playerState$;
  }

  testTracks = [
    {
      name: 'Mr. Brightside',
      artist: 'The Killers',
      uri: 'spotify:track:3n3Ppam7vgaVa1iaRUc9Lp'
    },
    {
      name: 'Blinding Lights',
      artist: 'The Weeknd',
      uri: 'spotify:track:0VjIjW4GlUZAMYd2vXMi3b'
    },
    {
      name: 'Shape of You',
      artist: 'Ed Sheeran',
      uri: 'spotify:track:7qiZfU4dY1lWllzX7mPBI'
    },
    {
      name: "God's Plan",
      artist: 'Drake',
      uri: 'spotify:track:6DCZcSspjsKoFjzjrWoCdn'
    },
    {
      name: 'Bohemian Rhapsody',
      artist: 'Queen',
      uri: 'spotify:track:6l8GvAyoUZwWDgF1e4822w'
    }
  ];

  playTrack(uri: string): void {
    console.log('Playing track:', uri);
    this.spotifyPlayer.play(uri);
  }

  togglePlayback(): void {
    console.log('Toggling playback');
    this.spotifyPlayer.togglePlay();
  }

  setVolume(volume: number): void {
    console.log('Setting volume to:', volume);
    this.spotifyPlayer.setVolume(volume);
  }

  seekTo(seconds: number): void {
    console.log('Seeking to:', seconds, 'seconds');
    this.spotifyPlayer.seek(seconds * 1000);
  }
}
