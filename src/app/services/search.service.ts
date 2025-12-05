import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
export interface SearchApiResponse {
  query: string;
  page: number;
  pageSize: number;
  albums: {
    count: number;
    results: AlbumResult[];
  };
  artists: {
    count: number;
    results: ArtistResult[];
  };
  users: {
    count: number;
    results: UserResult[];
  };
  posts: {
    count: number;
    results: PostResult[];
  };
}

export interface AlbumResult {
  id: string;
  title: string;
  artistName: string;
  coverArt: string;
  coverArtWidth: number;
  coverArtHeight: number;
  releaseDate?: string;
  genres?: string[];
}

export interface ArtistResult {
  id: string;
  name: string;
  details: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  spotifyId: string;
}

export interface UserResult {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  followerCount?: number;
  reviewCount?: number;
}

export interface PostResult {
  id: string;
  postType: string;
  user: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  } | null;
  album: {
    id: string;
    title: string;
    artistName: string;
    coverArt: string;
    coverArtWidth: number;
    coverArtHeight: number;
  } | null;
  artistName: string;
  commentText: string | null;
  ratingValue: number | null;
  createdAt: string;
}

// Unified item for the UI
export interface SearchItem {
  id: string;
  username: string;
  title: string;
  genres: string[];
  dateLabel: string;
  imageUrl: string;
  isArtist: boolean;
  favorites: number;
  rating: number;
  type: 'user' | 'album' | 'review' | 'artist';
}

export interface SearchParams {
  query: string;
  tab: 'all' | 'users' | 'albums' | 'reviews' | 'artists';
  sort?: 'relevance' | 'recent' | 'popular' | 'rating';
  page?: number;
  pageSize?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private baseUrl = 'https://api.crescendo.chat';

  constructor(private http: HttpClient) { }

  search(params: SearchParams): Observable<{ items: SearchItem[]; total: number }> {
    const { query, tab, page = 1, pageSize = 20 } = params;

    const httpParams = new HttpParams()
      .set('query', query)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<SearchApiResponse>(`${this.baseUrl}/v1/search`, { params: httpParams }).pipe(
      map(response => {
        let items: SearchItem[] = [];
        let total = 0;

        // Filter results based on tab
        switch (tab) {
          case 'all':
            // Combine all results
            items = [
              ...this.transformAlbums(response.albums.results),
              ...this.transformArtists(response.artists.results),
              ...this.transformUsers(response.users.results),
              ...this.transformPosts(response.posts.results)
            ];
            total = response.albums.count + response.artists.count +
              response.users.count + response.posts.count;
            break;

          case 'albums':
            items = this.transformAlbums(response.albums.results);
            total = response.albums.count;
            break;

          case 'artists':
            items = this.transformArtists(response.artists.results);
            total = response.artists.count;
            break;

          case 'users':
            items = this.transformUsers(response.users.results);
            total = response.users.count;
            break;

          case 'reviews':
            items = this.transformPosts(response.posts.results);
            total = response.posts.count;
            break;
        }

        return { items, total };
      })
    );
  }

  private transformAlbums(albums: AlbumResult[]): SearchItem[] {
    return albums.map(album => {
      // Fallback: use artistNames (comma/pipe/semicolon separated) if artistName is missing
      interface AlbumWithArtistNames extends AlbumResult {
        artistNames?: string;
      }

      const artist: string =
        album.artistName ||
        (typeof (album as AlbumWithArtistNames).artistNames === 'string'
          ? (album as AlbumWithArtistNames).artistNames?.split(/[|,;]/).map((s: string) => s.trim()).filter(Boolean)[0] ?? ''
          : '');

      return {
        id: album.id,
        username: artist, // normalized artist name
        title: album.title,
        genres: album.genres || [],
        dateLabel: album.releaseDate ? new Date(album.releaseDate).getFullYear().toString() : '',
        imageUrl: album.coverArt || '/assets/placeholder.png',
        isArtist: false,
        favorites: 0,
        rating: 0,
        type: 'album' as const
      };
    });
  }

  private transformArtists(artists: ArtistResult[]): SearchItem[] {
    return artists.map(artist => ({
      id: artist.id,
      username: artist.name,
      title: artist.name,
      genres: [],
      dateLabel: artist.details || '',
      imageUrl: artist.imageUrl || '/assets/placeholder.png',
      isArtist: true,
      favorites: 0,
      rating: 0,
      type: 'artist' as const
    }));
  }

  private transformUsers(users: UserResult[]): SearchItem[] {
    return users.map(user => ({
      id: user.id,
      username: user.username,
      title: user.displayName || user.username,
      genres: [],
      dateLabel: user.reviewCount ? `${user.reviewCount} reviews` : '',
      imageUrl: user.avatarUrl || '/assets/placeholder.png',
      isArtist: false,
      favorites: user.followerCount || 0,
      rating: 0,
      type: 'user' as const
    }));
  }

  private transformPosts(posts: PostResult[]): SearchItem[] {
    return posts.map(post => ({
      id: post.id,
      username: post.user?.username || post.artistName,
      title: post.album?.title || 'Untitled',
      genres: [],
      dateLabel: new Date(post.createdAt).toLocaleDateString(),
      imageUrl: post.album?.coverArt || '/assets/placeholder.png',
      isArtist: false,
      favorites: 0,
      rating: post.ratingValue || 0,
      type: 'review' as const
    }));
  }

  // Raw API access if needed
  searchRaw(query: string, page = 1, pageSize = 20): Observable<SearchApiResponse> {
    const params = new HttpParams()
      .set('query', query)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<SearchApiResponse>(`${this.baseUrl}/v1/search`, { params });
  }
}
