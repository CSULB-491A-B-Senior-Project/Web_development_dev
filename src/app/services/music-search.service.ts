// import { inject, Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable, of } from 'rxjs';
// import { Artist, Album, Song } from '../models/music.models';
// import { environment } from '../../environments/environment';

// @Injectable({
//   providedIn: 'root'
// })
// export class MusicSearchService {
//   #http = inject(HttpClient);
//   #apiUrl = (environment.apiBaseUrl ?? '/api/') + 'profile';
//   #useMocks = environment.useMocks;

//   // mock data (only used when #useMocks is true)
//   #mockSongs: Song[] = [
//     { id: 's1', name: 'The Less I Know The Better', artistName: 'Tame Impala', albumCover: '/assets/currents.jpg' },
//     { id: 's2', name: 'Pyramids', artistName: 'Frank Ocean', albumCover: '/assets/blonde.jpg' },
//   ];
//   #mockArtists: Artist[] = [
//     { id: '1', artistName: 'Tame Impala', artistImage: '/assets/tame-impala.jpg' },
//     { id: '2', artistName: 'Radiohead', artistImage: '/assets/radiohead.jpg' },
//     { id: '3', artistName: 'Daft Punk', artistImage: '/assets/daft-punk.jpg' },
//     { id: '4', artistName: 'Kendrick Lamar', artistImage: '/assets/kendrick-lamar.jpg' },
//     { id: '5', artistName: 'Frank Ocean', artistImage: '/assets/frank-ocean.jpg' },
//     { id: '6', artistName: 'Bon Iver', artistImage: '/assets/bon-iver.jpg' },
//     { id: '7', artistName: 'Fleetwood Mac', artistImage: '/assets/fleetwood-mac.jpg' },
//     { id: '8', artistName: 'The Beatles', artistImage: '/assets/the-beatles.jpg' },
//   ];
//   #mockAlbums: Album[] = [
//     { id: 'a1', name: 'Currents', releaseYear: 2015, artist: { artistName: 'Tame Impala' }, albumCover: '/assets/currents.jpg' },
//     { id: 'a2', name: 'In Rainbows', releaseYear: 2007, artist: { artistName: 'Radiohead' }, albumCover: '/assets/in-rainbows.jpg' },
//     { id: 'a3', name: 'Discovery', releaseYear: 2001, artist: { artistName: 'Daft Punk' }, albumCover: '/assets/discovery.jpg' },
//     { id: 'a4', name: 'good kid, m.A.A.d city', releaseYear: 2012, artist: { artistName: 'Kendrick Lamar' }, albumCover: '/assets/gkmc.jpg' },
//     { id: 'a5', name: 'Blonde', releaseYear: 2016, artist: { artistName: 'Frank Ocean' }, albumCover: '/assets/blonde.jpg' },
//     { id: 'a6', name: 'For Emma, Forever Ago', releaseYear: 2007, artist: { artistName: 'Bon Iver' }, albumCover: '/assets/fefa.jpg' },
//   ];

//   searchSongs(term: string): Observable<Song[]> {
//     const q = term.trim().toLowerCase();
//     if (this.#useMocks) return of(this.#mockSongs.filter(s => s.name.toLowerCase().includes(q)));
//     return this.#http.get<Song[]>(`${this.#apiUrl}/songs`, { params: { q } });
//   }

//   searchArtists(term: string): Observable<Artist[]> {
//     const q = term.trim().toLowerCase();
//     if (this.#useMocks) return of(this.#mockArtists.filter(a => a.artistName.toLowerCase().includes(q)));
//     return this.#http.get<Artist[]>(`${this.#apiUrl}/artists`, { params: { q } });
//   }

//   searchAlbums(term: string): Observable<Album[]> {
//     const q = term.trim().toLowerCase();
//     if (this.#useMocks) return of(this.#mockAlbums.filter(a => a.name.toLowerCase().includes(q)));
//     return this.#http.get<Album[]>(`${this.#apiUrl}/albums`, { params: { q } });
//   }

//   getAvailableArtists(): Observable<Artist[]> {
//     if (this.#useMocks) return of(this.#mockArtists);
//     return this.#http.get<Artist[]>(`${this.#apiUrl}/artists/all`);
//   }

//   getAvailableAlbums(): Observable<Album[]> {
//     if (this.#useMocks) return of(this.#mockAlbums);
//     return this.#http.get<Album[]>(`${this.#apiUrl}/albums/all`);
//   }
// }
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Artist, Album, Song } from '../models/music.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MusicSearchService {
  #http = inject(HttpClient);
  #apiUrl = (environment.apiBaseUrl ?? '').replace(/\/$/, '');
  #mock = (environment as unknown as { useMocks?: boolean }).useMocks === true;

  // mock data (only used when #mock is true)
  #mockSongs: Song[] = [
    { id: 's1', name: 'The Less I Know The Better', artistName: 'Tame Impala', albumCover: '/assets/currents.jpg' },
    { id: 's2', name: 'Pyramids', artistName: 'Frank Ocean', albumCover: '/assets/blonde.jpg' },
  ];
  #mockArtists: Artist[] = [
    { id: '1', artistName: 'Tame Impala', artistImage: '/assets/tame-impala.jpg' },
    { id: '2', artistName: 'Radiohead', artistImage: '/assets/radiohead.jpg' },
    { id: '3', artistName: 'Daft Punk', artistImage: '/assets/daft-punk.jpg' },
    { id: '4', artistName: 'Kendrick Lamar', artistImage: '/assets/kendrick-lamar.jpg' },
    { id: '5', artistName: 'Frank Ocean', artistImage: '/assets/frank-ocean.jpg' },
    { id: '6', artistName: 'Bon Iver', artistImage: '/assets/bon-iver.jpg' },
    { id: '7', artistName: 'Fleetwood Mac', artistImage: '/assets/fleetwood-mac.jpg' },
    { id: '8', artistName: 'The Beatles', artistImage: '/assets/the-beatles.jpg' },
  ];
  #mockAlbums: Album[] = [
    { id: 'a1', name: 'Currents', releaseYear: 2015, artist: { artistName: 'Tame Impala' }, albumCover: '/assets/currents.jpg' },
    { id: 'a2', name: 'In Rainbows', releaseYear: 2007, artist: { artistName: 'Radiohead' }, albumCover: '/assets/in-rainbows.jpg' },
    { id: 'a3', name: 'Discovery', releaseYear: 2001, artist: { artistName: 'Daft Punk' }, albumCover: '/assets/discovery.jpg' },
    { id: 'a4', name: 'good kid, m.A.A.d city', releaseYear: 2012, artist: { artistName: 'Kendrick Lamar' }, albumCover: '/assets/gkmc.jpg' },
    { id: 'a5', name: 'Blonde', releaseYear: 2016, artist: { artistName: 'Frank Ocean' }, albumCover: '/assets/blonde.jpg' },
    { id: 'a6', name: 'For Emma, Forever Ago', releaseYear: 2007, artist: { artistName: 'Bon Iver' }, albumCover: '/assets/fefa.jpg' },
  ];

  // Crescendo does not expose generic search endpoints. Use listing endpoints or Spotify import.
  listArtists(page = 1, pageSize = 20): Observable<Artist[]> {
    if (this.#mock) return of(this.#mockArtists);
    return this.#http.get<Artist[]>(`${this.#apiUrl}/v1/Search/artists`, { params: { page, pageSize } });
  }

  listAlbums(page = 1, pageSize = 20): Observable<Album[]> {
    if (this.#mock) return of(this.#mockAlbums);
    return this.#http.get<Album[]>(`${this.#apiUrl}/v1/Search/albums`, { params: { page, pageSize } });
  }

  listTracks(page = 1, pageSize = 50): Observable<Song[]> {
    if (this.#mock) return of(this.#mockSongs);
    return this.#http.get<Song[]>(`${this.#apiUrl}/v1/Search/tracks`, { params: { page, pageSize } });
  }

  // Spotify import endpoints
  importAlbum(spotifyAlbumId: string): Observable<void> {
    if (this.#mock) return of(void 0);
    return this.#http.post<void>(`${this.#apiUrl}/v1/Spotify/import-album/${encodeURIComponent(spotifyAlbumId)}`, {});
  }

  importAlbumsBatch(spotifyAlbumIds: string[]): Observable<void> {
    if (this.#mock) return of(void 0);
    return this.#http.post<void>(`${this.#apiUrl}/v1/Spotify/import-albums-batch`, { spotifyAlbumIds });
  }

  // Optional client-side filtering for mocks
  searchSongs(term: string): Observable<Song[]> {
    const q = term.trim().toLowerCase();
    if (this.#mock) return of(this.#mockSongs.filter(s => s.name.toLowerCase().includes(q)));
    // No server search; consider implementing backend search or filter client-side on listTracks()
    return this.listTracks().pipe();
  }

  searchArtists(term: string): Observable<Artist[]> {
    const q = term.trim().toLowerCase();
    if (this.#mock) return of(this.#mockArtists.filter(a => a.artistName?.toLowerCase().includes(q)));
    return this.listArtists().pipe();
  }

  searchAlbums(term: string): Observable<Album[]> {
    const q = term.trim().toLowerCase();
    if (this.#mock) return of(this.#mockAlbums.filter(a => a.name.toLowerCase().includes(q)));
    return this.listAlbums().pipe();
  }

  getAvailableArtists(): Observable<Artist[]> {
    if (this.#mock) return of(this.#mockArtists);
    return this.listArtists();
  }

  getAvailableAlbums(): Observable<Album[]> {
    if (this.#mock) return of(this.#mockAlbums);
    return this.listAlbums();
  }
}
