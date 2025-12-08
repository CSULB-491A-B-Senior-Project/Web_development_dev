import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';
import { Subject } from 'rxjs';
import {Track, Album} from '../models/playlist.models';

@Injectable({
  providedIn: 'root'
})
export class PlaylistCreatorService {
  private openCreatorSubject = new Subject<void>();
  public openCreator$ = this.openCreatorSubject.asObservable();

  openCreator(): void {
    this.openCreatorSubject.next();
  }
}

export interface SearchAlbumsResponse {
  data: Album[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface SearchTracksResponse {
  data: Track[];
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
   * Search for tracks
   */
  searchTracks(
    query: string,
    page: number = 1,
    pageSize: number = 20
  ): Observable<SearchTracksResponse> {
    const params = new URLSearchParams({
      query,
      page: page.toString(),
      pageSize: pageSize.toString()
    });

    return this.apiService.get<SearchTracksResponse>(
      `/Tracks?${params.toString()}`
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

  /**
   * Get all tracks in a playlist
   */
  getPlaylistTracks(playlistId: string): Observable<Track[]> {
    return this.apiService.get<Track[]>(`/Playlists/${playlistId}/tracks`);
  }

  /**
   * Add a single track to a playlist
   */
  addTrackToPlaylist(playlistId: string, trackId: string): Observable<{ message: string }> {
    return this.apiService.post<{ message: string }>(
      `/Playlists/${playlistId}/tracks`,
      { trackId }
    );
  }

  /**
   * Remove a single track from a playlist
   */
  removeTrackFromPlaylist(playlistId: string, trackId: string): Observable<void> {
    return this.apiService.delete<void>(`/Playlists/${playlistId}/tracks/${trackId}`);
  }

  /**
   * Add multiple tracks to a playlist in bulk
   */
  addTracksToPlaylist(playlistId: string, trackIds: string[]): Observable<{ message: string }> {
    return this.apiService.post<{ message: string }>(
      `/Playlists/${playlistId}/tracks/bulk`,
      { trackIds }
    );
  }

  /**
   * Remove multiple tracks from a playlist in bulk
   */
  removeTracksFromPlaylist(playlistId: string, trackIds: string[]): Observable<{ message: string }> {
    return this.apiService.delete<{ message: string }>(
      `/Playlists/${playlistId}/tracks/bulk`,
      { trackIds }
    );
  }

  /**
   * Get all tracks for an album
   */
  getAlbumTracks(albumId: string): Observable<Track[]> {
    return this.apiService.get<Track[]>(`/Tracks/album/${albumId}`);
  }
}
