import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

export interface SearchParams {
  query: string;
  tab?: 'all' | 'users' | 'albums' | 'reviews';
  sort?: 'relevance' | 'recent' | 'popular' | 'rating';
  page?: number;
  limit?: number;
}

export interface SearchResponse {
  items: SearchItem[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface SearchItem {
  id: number;
  username: string;
  title: string;
  genres: string[];
  dateLabel: string;
  imageUrl: string;
  isArtist: boolean;
  favorites: number;
  rating: number;
  type: 'user' | 'album' | 'review';
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  constructor(private api: ApiService) { }

  search(params: SearchParams): Observable<SearchResponse> {
    const queryParams = new URLSearchParams();

    if (params.query) queryParams.set('q', params.query);
    if (params.tab && params.tab !== 'all') queryParams.set('type', params.tab);
    if (params.sort) queryParams.set('sort', params.sort);
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());

    return this.api.get<SearchResponse>(`/search?${queryParams.toString()}`);
  }
}
