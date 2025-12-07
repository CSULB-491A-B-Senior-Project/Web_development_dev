import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FeedPost {
  id: string;
  type: 'comment_post' | 'rating_post' | 'album_post';
  user: {
    id: string;
    username: string;
  } | null;
  album: {
    id: string;
    title: string;
    artistName: string;
    coverArt: string;
    coverArtWidth: number;
    coverArtHeight: number;
  };
  content: string;
  rating: number | null;
  createdAt: string;
  matchScore: number;
  commentCount: number;
  ratingCount: number;
  userRating: number | null;
  recentComments: Array<{
    id: string;
    userId: string;
    username: string;
    text: string;
  }>;
}

export interface FeedResponse {
  page: number;
  pageSize: number;
  source: string;
  count: number;
  data: FeedPost[];
}

@Injectable({
  providedIn: 'root'
})
export class FeedService {
  constructor(private http: HttpClient) {}

  getFeed(userId?: string, page: number = 1, pageSize: number = 20): Observable<FeedResponse> {
    const params: any = { page, pageSize };
    if (userId) {
      params.userId = userId;
    }
    return this.http.get<FeedResponse>(`/v1/Feed`, { params });
  }
}
