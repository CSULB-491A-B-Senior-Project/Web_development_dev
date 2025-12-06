import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { of, Observable } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

type Reaction = 'like' | 'dislike' | null;
interface CommentDto {
  id: string;
  albumId: string;
  parentCommentId?: string;
  userId: string;
  username: string;
  text: string;
  createdDate: string;
  editedDate: string;
}

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
    return this.#http.get<CommentDto[]>(
      `${this.#apiUrl}/v1/Comments/albumComments/${albumId}`
    ).pipe(
      map(comments => {
        return this.buildCommentTree(comments);
      })
    );
  }

  /**
   * Builds a nested comment tree from flat array
   * Comments with parentCommentId become replies to their parent
   */
  private buildCommentTree(comments: CommentDto[]): any {
    const topLevel = comments.filter(c => !c.parentCommentId);

    return topLevel.map(comment => ({
      id: comment.id,
      author: comment.username,
      userId: comment.userId,
      text: comment.text,
      createdAt: comment.createdDate,
      likes: 0,
      dislikes: 0,
      userReaction: null,
      replies: comments
        .filter(c => c.parentCommentId === comment.id)
        .map(reply => ({
          id: reply.id,
          author: reply.username,
          userId: reply.userId,
          text: reply.text,
          createdAt: reply.createdDate,
          likes: 0,
          dislikes: 0,
          userReaction: null
        }))
    }));
  }

  /**
   * POST /v1/Comments
   * Creates a new top-level comment on an album
   */
  createComment(
    albumId: string,
    payload: { text: string }
  ): Observable<any> {
    return this.#http.post<CommentDto>(`${this.#apiUrl}/v1/Comments`, {
      albumId,
      text: payload.text,
      parentCommentId: null
    }).pipe(
      map(dto => ({
        id: dto.id,
        author: dto.username,
        userId: dto.userId,
        text: dto.text,
        createdAt: dto.createdDate,
        likes: 0,
        dislikes: 0,
        userReaction: null,
        replies: []
      }))
    );
  }

  /**
   * Updates an existing comment (not working yet)
   */
  updateComment(
    commentId: string,
    payload: { text: string; }
  ): Observable<any> {
    return this.#http.put<CommentDto>(`${this.#apiUrl}/v1/Comments/${commentId}`, {
      text: payload.text
    }).pipe(
      map(dto => ({
        id: dto.id,
        author: dto.username,
        userId: dto.userId,
        text: dto.text,
        createdAt: dto.createdDate,
        likes: 0,
        dislikes: 0,
        userReaction: null,
        replies: []
      }))
    );
  }

  /**
   * POST /v1/Comments with parentCommentId
   * Adds a reply to a comment
   */
  addReply(
    parentCommentId: string,
    payload: { text: string; albumId: string }
  ): Observable<any> {
    return this.#http.post<CommentDto>(`${this.#apiUrl}/v1/Comments`, {
      albumId: payload.albumId,
      parentCommentId: parentCommentId,
      text: payload.text
    }).pipe(
      map(dto => ({
        id: dto.id,
        author: dto.username,
        userId: dto.userId,
        text: dto.text,
        createdAt: dto.createdDate,
        likes: 0,
        dislikes: 0,
        userReaction: null
      }))
    );
  }

  /**
   * GET /v1/Comments/{id}
   * Loads a single comment
   */
  getCommentById(commentId: string): Observable<CommentDto> {
    return this.#http.get<CommentDto>(`${this.#apiUrl}/v1/Comments/${commentId}`);
  }

  /**
   * POST /v1/CommentLikes/{commentId}/like
   * DELETE /v1/CommentLikes/{commentId}/like
   */
  reactToComment(
    commentId: string,
    reaction: Reaction
  ): Observable<any> {
    if (reaction === 'like') {
      return this.#http.post<void>(
        `${this.#apiUrl}/v1/CommentLikes/${commentId}/like`,
        {}
      );
    }

    if (reaction === null) {
      // Remove like
      return this.#http.delete<void>(
        `${this.#apiUrl}/v1/CommentLikes/${commentId}/like`
      );
    }

    // 'dislike' - not supported
    console.warn('Dislike not supported by API');
    return of(null);
  }

  /**
   * GET /v1/CommentLikes/{commentId}
   * Gets like count for a comment
   */
  getCommentLikes(commentId: string): Observable<any> {
    return this.#http.get<any>(`${this.#apiUrl}/v1/CommentLikes/${commentId}`);
  }

  /**
 * POST /v1/Ratings
 * Creates or updates a rating for an album (upsert)
 */
  createOrUpdateRating(
    albumId: string,
    ratingValue: number
  ): Observable<any> {
    return this.#http.post<any>(`${this.#apiUrl}/v1/Ratings`, {
      albumId,
      ratingValue
    });
  }

  /**
   * GET /v1/Ratings/albumRating/{albumId}
   * Gets all ratings for an album
   */
  getAlbumRatings(albumId: string): Observable<any[]> {
    return this.#http.get<any[]>(
      `${this.#apiUrl}/v1/Ratings/albumRating/${albumId}`
    );
  }

  /**
   * GET /v1/Ratings/albumRating/{albumId}/user/{userId}
   * Gets a specific user's rating for an album
   */
  getUserRating(albumId: string, userId: string): Observable<any> {
    return this.#http.get<any>(
      `${this.#apiUrl}/v1/Ratings/albumRating/${albumId}/user/${userId}`
    );
  }
}
