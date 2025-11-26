import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of, Observable } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CommentDto, PagedDto, Reaction } from '../models/reviews.models';

@Injectable({ providedIn: 'root' })
export class AlbumReviewsService {
  
  #http = inject(HttpClient);
  #base = environment.apiBaseUrl ?? '';
  #mock = !environment.apiBaseUrl || (environment as unknown as { useMocks?: boolean }).useMocks === true;

  getAlbumById(id: string): Observable<unknown> {
    if (this.#mock) {
      return of({
        id,
        title: 'Demo Album',
        artistNames: 'Demo Artist A, Demo Artist B',
        year: 2023,
        coverUrl: 'https://picsum.photos/seed/demo-album/300/300',
        // Include tracks when mocking; component can read them directly
        tracks: [
          { id: 't1', title: 'Song 1', duration: 222 },
          { id: 't2', title: 'Song 2', duration: 245 },
          { id: 't3', title: 'Song 3', duration: 178 },
          { id: 't4', title: 'Song 4', duration: 193 },
          { id: 't5', title: 'Song 5', duration: 301 },
          { id: 't6', title: 'Song 6', duration: 207 },
        ],
      }).pipe(delay(150));
    }
    return this.#http.get(`${this.#base}/api/albums/${encodeURIComponent(id)}`);
  }

  // Fetch tracks from a dedicated endpoint (component handles both {items} and plain arrays)
  getAlbumTracks(albumId: string): Observable<unknown> {
    if (this.#mock) {
      const items = [
        { id: 't1', title: 'Song 1', duration: 222 },
        { id: 't2', title: 'Song 2', duration: 245 },
        { id: 't3', title: 'Song 3', duration: 178 },
        { id: 't4', title: 'Song 4', duration: 193 },
        { id: 't5', title: 'Song 5', duration: 301 },
        { id: 't6', title: 'Song 6', duration: 207 },
      ];
      return of({ items }).pipe(delay(150));
    }
    return this.#http.get(`${this.#base}/api/albums/${encodeURIComponent(albumId)}/tracks`);
  }

  getComments(albumId: string, page = 1, pageSize = 50): Observable<PagedDto<CommentDto>> {
    if (this.#mock) {
      const now = Date.now();
      const iso = (ms: number) => new Date(now - ms).toISOString();
      const items: CommentDto[] = [
        { id: 'c1', author: 'demo_user', text: 'Great album. Production is top‑notch.', rating: 5 } as CommentDto,
        { id: 'c2', author: 'listener42', text: 'A couple of tracks grew on me.', rating: 3 } as CommentDto,
      ];
      // Extras will be ignored by DTO typing but used in the mapper via safe readers
      const enriched = ([
        { ...items[0], createdAt: iso(1000 * 60 * 60 * 24 * 2), likes: 12, dislikes: 1, userReaction: null, replies: [
          { id: 'r1', author: 'another_user', text: 'Agree, it sounds huge on headphones.', createdAt: iso(1000 * 60 * 60 * 12), likes: 3, dislikes: 0, userReaction: null },
        ]},
        { ...items[1], createdAt: iso(1000 * 60 * 60 * 6), likes: 4, dislikes: 2, userReaction: null, replies: []},
      ]) as unknown as CommentDto[];
      const res: PagedDto<CommentDto> = { items: enriched, total: enriched.length, page, pageSize };
      return of(res).pipe(delay(200));
    }
    return this.#http.get<PagedDto<CommentDto>>(
      `${this.#base}/api/albums/${encodeURIComponent(albumId)}/comments`,
      { params: { page, pageSize } as unknown as Record<string, string> }
    );
  }

  createComment(albumId: string, payload: { text?: string; rating?: number | null }) {
    if (this.#mock) return of({ ...payload }).pipe(delay(120));
    return this.#http.post<CommentDto>(`${this.#base}/api/albums/${encodeURIComponent(albumId)}/comments`, payload);
  }

  updateComment(commentId: string, payload: { text?: string; rating?: number | null }) {
    if (this.#mock) return of({ id: commentId, ...payload }).pipe(delay(120));
    return this.#http.patch<CommentDto>(`${this.#base}/api/comments/${encodeURIComponent(commentId)}`, payload);
  }

  addReply(commentId: string, payload: { text: string }) {
    if (this.#mock) return of({ id: 'r-' + Math.random().toString(36).slice(2, 8), ...payload, createdAt: new Date().toISOString() }).pipe(delay(120));
    return this.#http.post(`${this.#base}/api/comments/${encodeURIComponent(commentId)}/replies`, payload);
  }

  reactToComment(targetId: string, reaction: Reaction) {
    if (this.#mock) return of({ reaction, likes: 0, dislikes: 0 }).pipe(delay(80));
    return this.#http.post<{ reaction: Reaction; likes: number; dislikes: number }>(
      `${this.#base}/api/comments/${encodeURIComponent(targetId)}/reactions`,
      { reaction }
    );
  }

  toggleAlbumFavorite(albumId: string, favorite: boolean) {
    if (this.#mock) return of({ favorite }).pipe(delay(80));
    return this.#http.post<{ favorite: boolean }>(
      `${this.#base}/api/albums/${encodeURIComponent(albumId)}/favorite`,
      { favorite }
    );
  }
}