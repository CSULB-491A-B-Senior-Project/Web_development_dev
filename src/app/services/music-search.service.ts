import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Artist, Album, Song } from '../models/music.models';
import { environment } from '../../environments/environment';


@Injectable({ providedIn: 'root' })
export class MusicSearchService {
  #http = inject(HttpClient);
  #apiUrl = (environment.apiBaseUrl ?? '').replace(/\/$/, '');
  #mock = (environment as unknown as { useMocks?: boolean }).useMocks === true;

  private albumCoverCache = new Map<string, string | null>();


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

  return this.#http
    .get<any>(`${this.#apiUrl}/v1/Search/tracks`, { params: { page, pageSize } })
    .pipe(
      tap(r => console.log("RAW LIST TRACKS RESPONSE:", r)),
      map((response: any) => {
        const tracks = Array.isArray(response)
          ? response
          : response
          ? [response]
          : [];

        return tracks.map((r: any) => ({
          id: r.id,
          name: r.name,
          artistName: r.artistNames ?? "",
          albumCoverUrl: undefined,
          albumCover: undefined,
          durationMs: r.duration ? r.duration * 1000 : undefined,
          trackNumber: r.trackNumber,
          raw: r
        })) as Song[];
      })
    );
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

searchSongs(term: string, page = 1, pageSize = 50): Observable<Song[]> {
  const query = term.trim();
  if (!query) return of([]);

  const params = { query, page, pageSize, importFromSpotify: true };

  return this.#http
    .get<{ data: any[] }>(`${this.#apiUrl}/v1/Search/tracks`, { params })
    .pipe(
      tap(res => console.log("RAW TRACK RESPONSE:", res)),

      switchMap(res => {
        const items = Array.isArray(res?.data) ? res.data : [];

        // Map to Song objects without album cover initially
        const baseSongs = items.map(r => ({
          id: r.id,
          name: r.name,
          artistName: r.artistNames ?? "",
          albumCover: undefined,
          albumCoverUrl: undefined,
          durationMs: r.duration ? r.duration * 1000 : undefined,
          trackNumber: r.trackNumber,
          raw: r,
          albumId: r.albumId // temp field for loading
        }));

        // Fetch album cover for each song in parallel
        const albumCoverRequests = baseSongs.map(song =>
          this.fetchAlbumCover(song.albumId).pipe(
            map(coverUrl => ({
              ...song,
              albumCover: coverUrl ?? undefined,
              albumCoverUrl: coverUrl ?? undefined
            }))
          )
        );

        // Wait for all cover requests to finish
        return forkJoin(albumCoverRequests);
      })
    );
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

  fetchAlbumCover(albumId: string): Observable<string | null> {
    if (!albumId) return of(null);

    // If cached, return immediately
    if (this.albumCoverCache.has(albumId)) {
      return of(this.albumCoverCache.get(albumId)!);
    }

    return this.#http.get<any>(`${this.#apiUrl}/v1/Albums/${encodeURIComponent(albumId)}`).pipe(
      map(album => {
        // ✔ Correct field from API
        const url = album?.coverArt ?? null;

        this.albumCoverCache.set(albumId, url);
        return url;
      }),
      catchError(() => {
        this.albumCoverCache.set(albumId, null);
        return of(null);
      })
    );
  }

   getSongById(id: string): Observable<Song | null> {
    if (!id) return of(null);

    return this.#http.get<unknown>(`${this.#apiUrl}/v1/Tracks/${id}`).pipe(
      map(raw => ({
        id: (raw as { id?: string }).id ?? id,
        name: (raw as { name?: string }).name ?? '',
        artistName: (raw as { artistName?: string, artistNames?: string }).artistName ?? (raw as { artistNames?: string }).artistNames ?? '',
        albumCoverUrl: (raw as { albumCoverUrl?: string, albumCover?: string }).albumCoverUrl ?? (raw as { albumCover?: string }).albumCover ?? '',
        trackNumber: (raw as { trackNumber?: number }).trackNumber ?? 0,
        raw
      })),
      catchError(err => {
        console.error('[ProfileService] getSongById failed:', err?.status ?? 0, err?.error ?? err);
        return of(null);
      })
    );
  }

}

