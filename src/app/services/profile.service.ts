import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Artist, Album, Song } from '../models/music.models'; // Corrected path

export interface UserProfile {
  bio: string;
  favoriteSong: Song | null;
  favoriteArtists: Artist[];
  favoriteAlbums: Album[];
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  #http = inject(HttpClient);
  #apiUrl = '/api/profile'; // Replace with your actual API endpoint

  getProfile(): Observable<UserProfile> {
    // In a real app, this would be: return this.#http.get<UserProfile>(this.#apiUrl);
    // For now, we return mock data.
    const mockProfile: UserProfile = {
      bio: 'This is my current bio. I love discovering new music and sharing my favorite tracks.',
      favoriteSong: { id: 's1', name: 'The Less I Know The Better', artistName: 'Tame Impala', albumCover: '/assets/currents.jpg' },
      favoriteArtists: [
        { id: '3', artistName: 'Daft Punk', artistImage: '/assets/daft-punk.jpg' },
        { id: '1', artistName: 'Tame Impala', artistImage: '/assets/tame-impala.jpg' },
      ],
      favoriteAlbums: [
        { id: 'a3', name: 'Discovery', releaseYear: 2001, artist: { artistName: 'Daft Punk' }, albumCover: '/assets/discovery.jpg' },
        { id: 'a1', name: 'Currents', releaseYear: 2015, artist: { artistName: 'Tame Impala' }, albumCover: '/assets/currents.jpg' },
      ]
    };
    return of(mockProfile);
  }

  updateBio(bio: string): Observable<void> {
    return this.#http.patch<void>(`${this.#apiUrl}/bio`, { bio });
  }

  updateFavoriteSong(song: Song | null): Observable<void> {
    return this.#http.put<void>(`${this.#apiUrl}/favorite-song`, { songId: song?.id });
  }

  updateFavoriteArtists(artists: Artist[]): Observable<void> {
    const artistIds = artists.map(a => a.id);
    return this.#http.put<void>(`${this.#apiUrl}/favorite-artists`, { artistIds });
  }

  updateFavoriteAlbums(albums: Album[]): Observable<void> {
    const albumIds = albums.map(a => a.id);
    return this.#http.put<void>(`${this.#apiUrl}/favorite-albums`, { albumIds });
  }

  uploadBackgroundImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('background', file);
    return this.#http.post<{ url: string }>(`${this.#apiUrl}/background-image`, formData);
  }
}