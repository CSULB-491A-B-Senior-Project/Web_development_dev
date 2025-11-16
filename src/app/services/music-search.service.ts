import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Artist, Album, Song } from '../models/music.models'; // Corrected path

@Injectable({
  providedIn: 'root'
})
export class MusicSearchService {
  #http = inject(HttpClient);
  #apiUrl = '/api/search'; // Replace with your actual API endpoint

  searchSongs(term: string): Observable<Song[]> {
    // Real: return this.#http.get<Song[]>(`${this.#apiUrl}/songs`, { params: { q: term } });
    const mockSongs: Song[] = [
      { id: 's1', name: 'The Less I Know The Better', artistName: 'Tame Impala', albumCover: '/assets/currents.jpg' },
      { id: 's2', name: 'Pyramids', artistName: 'Frank Ocean', albumCover: '/assets/blonde.jpg' },
    ];
    return of(mockSongs.filter(s => s.name.toLowerCase().includes(term.toLowerCase())));
  }

  searchArtists(term: string): Observable<Artist[]> {
    // Real: return this.#http.get<Artist[]>(`${this.#apiUrl}/artists`, { params: { q: term } });
    const mockArtists: Artist[] = [
      { id: '1', artistName: 'Tame Impala', artistImage: '/assets/tame-impala.jpg' },
      { id: '2', artistName: 'Radiohead', artistImage: '/assets/radiohead.jpg' },
    ];
    return of(mockArtists.filter(a => a.artistName.toLowerCase().includes(term.toLowerCase())));
  }

  searchAlbums(term: string): Observable<Album[]> {
    // Real: return this.#http.get<Album[]>(`${this.#apiUrl}/albums`, { params: { q: term } });
    const mockAlbums: Album[] = [
      { id: 'a1', name: 'Currents', releaseYear: 2015, artist: { artistName: 'Tame Impala' }, albumCover: '/assets/currents.jpg' },
      { id: 'a2', name: 'In Rainbows', releaseYear: 2007, artist: { artistName: 'Radiohead' }, albumCover: '/assets/in-rainbows.jpg' },
    ];
    return of(mockAlbums.filter(a => a.name.toLowerCase().includes(term.toLowerCase())));
  }

  getAvailableArtists(): Observable<Artist[]> {
    // In a real app, this would fetch a list of artists from your backend
    const mockArtists: Artist[] = [
      { id: '1', artistName: 'Tame Impala', artistImage: '/assets/tame-impala.jpg' },
      { id: '2', artistName: 'Radiohead', artistImage: '/assets/radiohead.jpg' },
      { id: '3', artistName: 'Daft Punk', artistImage: '/assets/daft-punk.jpg' },
      { id: '4', artistName: 'Kendrick Lamar', artistImage: '/assets/kendrick-lamar.jpg' },
      { id: '5', artistName: 'Frank Ocean', artistImage: '/assets/frank-ocean.jpg' },
      { id: '6', artistName: 'Bon Iver', artistImage: '/assets/bon-iver.jpg' },
      { id: '7', artistName: 'Fleetwood Mac', artistImage: '/assets/fleetwood-mac.jpg' },
      { id: '8', artistName: 'The Beatles', artistImage: '/assets/the-beatles.jpg' },
    ];
    return of(mockArtists);
  }
}