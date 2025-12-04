import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Artist {
  artistName: string;
}

export interface Album {
  id: string;
  name: string;
  releaseYear: number;
  artist: Artist;
  albumCover: string;
}

export interface SearchAlbumsResponse {
  data: Album[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface CreatePlaylistRequest {
  name: string;
  description?: string;
}

export interface PlaylistResponse {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class PlaylistService {
  constructor(private apiService: ApiService) {}

  /**
   * Search for albums
   */
  searchAlbums(
    query: string,
    page: number = 1,
    pageSize: number = 20,
    useSemanticSearch: boolean = true,
    importFromSpotify: boolean = true
  ): Observable<SearchAlbumsResponse> {
    const params = new URLSearchParams({
      query,
      page: page.toString(),
      pageSize: pageSize.toString(),
      useSemanticSearch: useSemanticSearch.toString(),
      importFromSpotify: importFromSpotify.toString()
    });

    return this.apiService.get<SearchAlbumsResponse>(
      `/Search/albums?${params.toString()}`
    );
  }

  /**
   * Create a new playlist
   */
  createPlaylist(request: CreatePlaylistRequest): Observable<PlaylistResponse> {
    return this.apiService.post<PlaylistResponse>('/Playlists', request);
  }

  /**
   * Get all playlists for the authenticated user
   */
  getUserPlaylists(): Observable<PlaylistResponse[]> {
    return this.apiService.get<PlaylistResponse[]>('/Playlists/me');
  }

  /**
   * Get a specific playlist by ID
   */
  getPlaylist(id: string): Observable<PlaylistResponse> {
    return this.apiService.get<PlaylistResponse>(`/Playlists/${id}`);
  }

  /**
   * Update a playlist
   */
  updatePlaylist(id: string, request: CreatePlaylistRequest): Observable<PlaylistResponse> {
    return this.apiService.put<PlaylistResponse>(`/Playlists/${id}`, request);
  }

  /**
   * Delete a playlist
   */
  deletePlaylist(id: string): Observable<void> {
    return this.apiService.delete<void>(`/Playlists/${id}`);
  }
}
