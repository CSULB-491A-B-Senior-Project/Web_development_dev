import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http'; import { of, Observable } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

type Reaction = 'like' | 'dislike' | null;

@Injectable({ providedIn: 'root' })
export class AlbumReviewsService {
  #http = inject(HttpClient);
  #apiUrl = (environment.apiBaseUrl ?? '').replace(/\/$/, '');

  // Crescendo API: GET /v1/Albums/{id}
  getAlbumById(id: string): Observable<unknown> {
    return this.#http.get(`${this.#apiUrl}/v1/Albums/${encodeURIComponent(id)}`);
  }

  // Crescendo API: GET /v1/Tracks/album/{albumId}
  getAlbumTracks(albumId: string): Observable<unknown[]> {
    // Spec returns a list; normalize to array
    return this.#http
      .get<unknown[] | { items?: unknown[] }>(`${this.#apiUrl}/v1/Tracks/album/${encodeURIComponent(albumId)}`)
      .pipe(map(res => Array.isArray(res) ? res : (res.items ?? [])));
  }

  getComments(albumId: string, page = 1, pageSize = 50): Observable<any> {
    const params = new HttpParams()
      .set('pageNumber', String(page))
      .set('pageSize', String(pageSize));

    // If your API doesn’t support paging yet, it will just ignore these params.
    return this.#http.get<any>(
      `${this.#apiUrl}/Comments/albumComments/${albumId}`,
      { params }
    );
  }

  /**
   * Creates a new top-level comment on an album.
   * album-details calls: createComment(albumId, { text, rating })
   */
  createComment(
    albumId: string,
    payload: { text: string; rating: number | null }
  ): Observable<any> {
    return this.#http.post<any>(`${this.#apiUrl}/Comments`, {
      albumId,
      text: payload.text,
      rating: payload.rating,
    });
  }

  /**
   * Updates an existing comment.
   * album-details calls: updateComment(commentId, { text, rating })
   *
   * This assumes your backend exposes PUT /v1/Comments/{id}
   * (if it’s PATCH instead, just change to this.http.patch).
   */
  updateComment(
    commentId: string,
    payload: { text: string; rating: number | null }
  ): Observable<any> {
    return this.#http.put<any>(`${this.#apiUrl}/Comments/${commentId}`, {
      text: payload.text,
      rating: payload.rating,
    });
  }

  /**
   * Adds a reply to a comment.
   * album-details calls: addReply(parentId, { text })
   *
   * Here I’m assuming replies are modeled as Comments with a parentCommentId.
   * If your API has a dedicated /Replies endpoint, just change the URL/body.
   */
  addReply(
    parentCommentId: string,
    payload: { text: string }
  ): Observable<any> {
    return this.#http.post<any>(`${this.#apiUrl}/Comments`, {
      parentCommentId,
      text: payload.text,
    });
  }

  /**
   * Loads a single comment; handy if you ever need to refresh one.
   */
  getCommentById(commentId: string): Observable<any> {
    return this.#http.get<any>(`${this.#apiUrl}/Comments/${commentId}`);
  }

  /**
   * Reacts to a comment.
   * album-details calls: reactToComment(commentId, reaction)
   *
   * From your Swagger:
   *   POST   /v1/CommentLikes/{commentId}/like
   *   DELETE /v1/CommentLikes/{commentId}/like
   *
   * I’ve mapped:
   *   'like'  -> POST  /like
   *   null    -> DELETE /like (remove like)
   *   'dislike' -> placeholder; adjust to your real backend endpoint.
   */
  reactToComment(
    commentId: string,
    reaction: Reaction
  ): Observable<any> {
    if (reaction === 'like') {
      return this.#http.post<any>(
        `${this.#apiUrl}/CommentLikes/${commentId}/like`,
        {}
      );
    }

    if (reaction === null) {
      // remove like / clear reaction
      return this.#http.delete<any>(
        `${this.#apiUrl}/CommentLikes/${commentId}/like`
      );
    }

    // 'dislike' case – adjust if your API has a proper dislike endpoint
    // e.g. POST /v1/CommentLikes/{commentId}/dislike
    return of(null);
  }
}
