import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Artist, Album, Song } from '../models/music.models';
import { environment } from '../../environments/environment';
import { ApiService } from '../api.service';
import { UserAccount } from '../models/account.models';
import { HttpClient } from '@angular/common/http';
// export interface UserProfile {
//   id: string;
//   username?: string;
//   email?: string;
//   firstName?: string;
//   lastName?: string;

//   bio?: string;
//   albumCount: number;
//   followingCount: number;

//   profilePictureUrl?: string;
//   backgroundImageUrl?: string;

//   favoriteSong: Song | null;
//   favoriteArtists: Artist[];
//   favoriteAlbums: Album[];
// }

type FavoriteArtistRankUpdate = { artistId: string; rank: number };
type UpdateFavoriteArtistsRequest = { artists: FavoriteArtistRankUpdate[] };
type UpdateFavoriteSongRequest = { favoriteSongId: string | null };

@Injectable({ providedIn: 'root' })
export class ProfileService {
  http = inject(HttpClient);
  apiUrl = (environment.apiBaseUrl ?? '').replace(/\/$/, '');
  #mock = (environment as unknown as { useMocks?: boolean }).useMocks === true;

  constructor (
    private api: ApiService
  ) {}
  
  // Mock source
  // #mockProfile(): UserProfile {
  //   return {
  //     id: 'user-123',
  //     bio: 'This is my current bio. I love discovering new music and sharing my favorite tracks.',
  //     profilePictureUrl: 'https://picsum.photos/seed/card-1/600/600',
  //     backgroundImageUrl: 'https://picsum.photos/seed/background-1/1200/600',
  //     favoriteSong: {
  //       id: 's1',
  //       name: 'The Less I Know The Better',
  //       artistName: 'Tame Impala',
  //       albumCover: 'https://picsum.photos/seed/card-4/600/600'
  //     },
  //     favoriteArtists: [
  //       { id: '3', artistName: 'Daft Punk', artistImage: 'https://picsum.photos/seed/card-2/600/600' },
  //       { id: '1', artistName: 'Tame Impala', artistImage: 'https://picsum.photos/seed/card-3/600/600' },
  //     ],
  //     favoriteAlbums: [
  //       { id: 'a3', name: 'Discovery', releaseYear: 2001, artist: { artistName: 'Daft Punk' }, albumCover: 'https://picsum.photos/seed/card-2/600/600' },
  //       { id: 'a1', name: 'Currents', releaseYear: 2015, artist: { artistName: 'Tame Impala' }, albumCover: 'https://picsum.photos/seed/card-3/600/600' },
  //     ],
  //     username: 'demo_user',
  //     email: 'demo@example.com',
  //     firstName: 'Demo',
  //     lastName: 'User'
  //   };
  // }

  // Crescendo API: GET /v1/Users/me
  getProfile(): Observable<UserAccount> {
    // if (this.#mock) return of(this.#mockProfile());
    return this.api.get<UserAccount>(`/Users/me`);
  }

  // Crescendo API: PUT /v1/Users/me
  updateProfile(payload: Partial<UserAccount>): Observable<void> {
    // if (this.#mock) return of(void 0);
    const { bio, username, email, firstName, lastName } = payload;
    return this.api.put<void>(`/Users/me`, { bio, username, email, firstName, lastName });
  }

  updateBio(bio: string): Observable<void> {
    // if (this.#mock) return of(void 0);
    return this.api.put<void>(`/Users/me/bio`, { bio });
  }

  // Update the user's favorite song
  updateFavoriteSong(songId: string | null): Observable<void> {
    // const base = (environment.apiBaseUrl ?? '').replace(/\/$/, '');
    // const url = `${this.apiUrl}/v1/Users/me/favorite-song`;

    const payload: UpdateFavoriteSongRequest = { favoriteSongId: songId };

    return this.api.put<void>(`/Users/me/favorite-song`, payload).pipe(
      catchError(err => {
        console.error('[ProfileService] favorite-song PUT failed:', err?.status ?? 0, err?.error ?? err);
        throw err;
      })
    );
  }

  getFavoriteArtists(): Observable<Artist[]> {
    // if (this.#mock) return of(this.#mockProfile().favoriteArtists ?? []);
    return this.api.get<Artist[]>(`/Users/me/favorite-artists`);
  }

  updateFavoriteArtistRanks(rankedArtists: FavoriteArtistRankUpdate[]): Observable<void> {
    if (this.#mock) return of(void 0);

    if (!Array.isArray(rankedArtists) || rankedArtists.length === 0) {
      console.warn('[ProfileService] Skipping PUT favorite-artists: empty rankedArtists payload');
      return of(void 0);
    }

    // const url = `${this.apiUrl}/v1/Users/me/favorite-artists`;
    const payload: UpdateFavoriteArtistsRequest = { artists: rankedArtists };

    console.log('[ProfileService] PUT: /Users/me/favorite-artists', 'payload.artists.length =', payload.artists.length);

    return this.api.put<void>(`/Users/me/favorite-artists`, payload).pipe(
      catchError(err => {
        console.error('[ProfileService] favorite-artists PUT failed:', err?.status, err?.error);
        throw err;
      })
    );
  }

  getFavoriteAlbums(): Observable<Album[]> {
    // if (this.#mock) return of(this.#mockProfile().favoriteAlbums ?? []);
    return this.api.get<Album[]>(`/Users/me/favorite-albums`);
  }

  addFavoriteAlbum(albumId: string): Observable<void> {
    // if (this.#mock) return of(void 0);
    return this.api.post<void>(`/Users/me/favorite-albums`, { albumId });
  }

  removeFavoriteAlbum(albumId: string): Observable<void> {
    // if (this.#mock) return of(void 0);
    return this.api.delete<void>(`/Users/me/favorite-albums/${albumId}`);
  }

  // uploadProfilePicture(): Observable<{ url: string }> {
  //   if (this.#mock) return of({ url: 'https://picsum.photos/seed/new-profile/600/600' });
  //   throw new Error('Profile picture upload is not defined in Crescendo v1.');
  // }

  // uploadBackgroundImage(): Observable<{ url: string }> {
  //   if (this.#mock) return of({ url: 'https://picsum.photos/seed/new-background/1200/600' });
  //   throw new Error('Background image upload is not defined in Crescendo v1.');
  // }

  confirmUpload(filePath: string, type: 'profile' | 'bg'): Observable<{ url?: string } | void> {
    if (this.#mock) return of(void 0);
    return this.api.post<{ url?: string }>(`/Users/confirm-upload`, { filePath, type });
  }
}