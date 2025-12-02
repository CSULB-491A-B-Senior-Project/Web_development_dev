// import { inject, Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable, of } from 'rxjs';
// import { Artist, Album, Song } from '../models/music.models';
// import { environment } from '../../environments/environment';

// export interface UserProfile {
//   bio: string;
//   profilePictureUrl: string;
//   favoriteSong: Song | null;
//   favoriteArtists: Artist[];
//   favoriteAlbums: Album[];
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class ProfileService {
//   #http = inject(HttpClient);
//   #apiUrl = (environment.apiBaseUrl ?? '/api/') + 'profile';
//   #mock = !environment.apiBaseUrl || (environment as unknown as { useMocks?: boolean }).useMocks === true;

//   // Mock source
//   #mockProfile(): UserProfile {
//     return {
//       bio: 'This is my current bio. I love discovering new music and sharing my favorite tracks.',
//       profilePictureUrl: 'https://picsum.photos/seed/card-1/600/600',
//       favoriteSong: {
//         id: 's1',
//         name: 'The Less I Know The Better',
//         artistName: 'Tame Impala',
//         albumCover: 'https://picsum.photos/seed/card-4/600/600'
//       },
//       favoriteArtists: [
//         { id: '3', artistName: 'Daft Punk', artistImage: 'https://picsum.photos/seed/card-2/600/600' },
//         { id: '1', artistName: 'Tame Impala', artistImage: 'https://picsum.photos/seed/card-3/600/600' },
//       ],
//       favoriteAlbums: [
//         { id: 'a3', name: 'Discovery', releaseYear: 2001, artist: { artistName: 'Daft Punk' }, albumCover: 'https://picsum.photos/seed/card-2/600/600' },
//         { id: 'a1', name: 'Currents', releaseYear: 2015, artist: { artistName: 'Tame Impala' }, albumCover: 'https://picsum.photos/seed/card-3/600/600' },
//       ]
//     };
//   }

//   getProfile(): Observable<UserProfile> {
//     if (this.#mock) return of(this.#mockProfile());
//     return this.#http.get<UserProfile>(this.#apiUrl);
//   }

//   updateBio(bio: string): Observable<void> {
//     if (this.#mock) return of(void 0);
//     return this.#http.patch<void>(`${this.#apiUrl}/bio`, { bio });
//   }

//   updateFavoriteSong(song: Song | null): Observable<void> {
//     if (this.#mock) return of(void 0);
//     return this.#http.put<void>(`${this.#apiUrl}/favorite-song`, { songId: song?.id ?? null });
//   }

//   followArtist(artistId: string): Observable<void> {
//     if (this.#mock) return of(void 0);
//     return this.#http.post<void>(`${this.#apiUrl}/favorite-artists`, { artistId });
//   }

//   unfollowArtist(artistId: string): Observable<void> {
//     if (this.#mock) return of(void 0);
//     return this.#http.delete<void>(`${this.#apiUrl}/favorite-artists/${artistId}`);
//   }

//   updateFavoriteArtists(artists: Artist[]): Observable<void> {
//     if (this.#mock) return of(void 0);
//     const artistIds = artists.map(a => a.id);
//     return this.#http.put<void>(`${this.#apiUrl}/favorite-artists`, { artistIds });
//   }

//   updateFavoriteAlbums(albums: Album[]): Observable<void> {
//     if (this.#mock) return of(void 0);
//     const albumIds = albums.map(a => a.id);
//     return this.#http.put<void>(`${this.#apiUrl}/favorite-albums`, { albumIds });
//   }

//   uploadProfilePicture(file: File): Observable<{ url: string }> {
//     if (this.#mock) return of({ url: 'https://picsum.photos/seed/new-profile/600/600' });
//     const formData = new FormData();
//     formData.append('profilePicture', file);
//     return this.#http.post<{ url: string }>(`${this.#apiUrl}/profile-picture`, formData);
//   }

//   uploadBackgroundImage(file: File): Observable<{ url: string }> {
//     if (this.#mock) return of({ url: 'https://picsum.photos/seed/new-background/1200/600' });
//     const formData = new FormData();
//     formData.append('background', file);
//     return this.#http.post<{ url: string }>(`${this.#apiUrl}/background-image`, formData);
//   }
// }
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Artist, Album, Song } from '../models/music.models';
import { environment } from '../../environments/environment';

export interface UserProfile {
  bio?: string;
  profilePictureUrl?: string;
  favoriteSong: Song | null;
  favoriteArtists: Artist[];
  favoriteAlbums: Album[];
  // The Crescendo Users/me schema may include fields like username, email, etc.
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  #http = inject(HttpClient);
  #apiUrl = (environment.apiBaseUrl ?? '').replace(/\/$/, '');
  #mock = (environment as unknown as { useMocks?: boolean }).useMocks === true;

  // Mock source
  #mockProfile(): UserProfile {
    return {
      bio: 'This is my current bio. I love discovering new music and sharing my favorite tracks.',
      profilePictureUrl: 'https://picsum.photos/seed/card-1/600/600',
      favoriteSong: {
        id: 's1',
        name: 'The Less I Know The Better',
        artistName: 'Tame Impala',
        albumCover: 'https://picsum.photos/seed/card-4/600/600'
      },
      favoriteArtists: [
        { id: '3', artistName: 'Daft Punk', artistImage: 'https://picsum.photos/seed/card-2/600/600' },
        { id: '1', artistName: 'Tame Impala', artistImage: 'https://picsum.photos/seed/card-3/600/600' },
      ],
      favoriteAlbums: [
        { id: 'a3', name: 'Discovery', releaseYear: 2001, artist: { artistName: 'Daft Punk' }, albumCover: 'https://picsum.photos/seed/card-2/600/600' },
        { id: 'a1', name: 'Currents', releaseYear: 2015, artist: { artistName: 'Tame Impala' }, albumCover: 'https://picsum.photos/seed/card-3/600/600' },
      ],
      username: 'demo_user',
      email: 'demo@example.com',
      firstName: 'Demo',
      lastName: 'User'
    };
  }

  // Crescendo API: GET /v1/Users/me
  getProfile(): Observable<UserProfile> {
    if (this.#mock) return of(this.#mockProfile());
    return this.#http.get<UserProfile>(`${this.#apiUrl}/v1/Users/me`);
  }

  // Crescendo API: PUT /v1/Users/me
  updateProfile(payload: Partial<UserProfile>): Observable<void> {
    if (this.#mock) return of(void 0);
    const { bio, username, email, firstName, lastName } = payload;
    return this.#http.put<void>(`${this.#apiUrl}/v1/Users/me`, { bio, username, email, firstName, lastName });
  }

  // Crescendo API: DELETE /v1/Users/me
  deleteProfile(): Observable<void> {
    if (this.#mock) return of(void 0);
    return this.#http.delete<void>(`${this.#apiUrl}/v1/Users/me`);
  }

  // Crescendo API: PUT /v1/Users/me/password
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    if (this.#mock) return of(void 0);
    return this.#http.put<void>(`${this.#apiUrl}/v1/Users/me/password`, { currentPassword, newPassword });
  }

  // The Crescendo spec does not define endpoints for:
  // - favorite artists/albums lists
  // - follow/unfollow artist
  // - profile picture/background uploads
  // Keep mock behaviors for UI, but throw in non-mock mode to prevent silent failure.

  updateBio(bio: string): Observable<void> {
    if (this.#mock) return of(void 0);
    throw new Error('No /profile/bio endpoint in Crescendo v1. Use PUT /v1/Users/me to update bio.');
  }

  updateFavoriteSong(song: Song | null): Observable<void> {
    if (this.#mock) return of(void 0);
    throw new Error('Favorites API not defined in Crescendo v1. Add backend support or remove UI.');
  }

  followArtist(): Observable<void> {
    if (this.#mock) return of(void 0);
    throw new Error('Follow artist is not defined in Crescendo v1. Add backend support or remove UI.');
  }

  unfollowArtist(): Observable<void> {
    if (this.#mock) return of(void 0);
    throw new Error('Unfollow artist is not defined in Crescendo v1. Add backend support or remove UI.');
  }

  updateFavoriteArtists(): Observable<void> {
    if (this.#mock) return of(void 0);
    throw new Error('Favorite artists endpoint is not defined in Crescendo v1.');
  }

  updateFavoriteAlbums(): Observable<void> {
    if (this.#mock) return of(void 0);
    throw new Error('Favorite albums endpoint is not defined in Crescendo v1.');
  }

  uploadProfilePicture(): Observable<{ url: string }> {
    if (this.#mock) return of({ url: 'https://picsum.photos/seed/new-profile/600/600' });
    throw new Error('Profile picture upload is not defined in Crescendo v1.');
  }

  uploadBackgroundImage(): Observable<{ url: string }> {
    if (this.#mock) return of({ url: 'https://picsum.photos/seed/new-background/1200/600' });
    throw new Error('Background image upload is not defined in Crescendo v1.');
  }
}
