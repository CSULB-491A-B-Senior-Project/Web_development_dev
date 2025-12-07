import { Injectable, inject } from '@angular/core';
import { of, Observable } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiService } from '../api.service';

type Reaction = 'like' | null;
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
  constructor(private api: ApiService) {}

  // Crescendo API: GET /v1/Albums/{id}
  getAlbumById(id: string): Observable<unknown> {
    return this.api.get(`/Albums/${encodeURIComponent(id)}`);
  }

  // Crescendo API: GET /v1/Tracks/album/{albumId}
  getAlbumTracks(albumId: string): Observable<unknown[]> {
    // Spec returns a list; normalize to array
    return this.api
      .get<unknown[] | { items?: unknown[] }>(`/Tracks/album/${encodeURIComponent(albumId)}`)
      .pipe(map(res => Array.isArray(res) ? res : (res.items ?? [])));
  }

  getComments(albumId: string, page = 1, pageSize = 50): Observable<any> {
    return this.api.get<CommentDto[]>(
      `/Comments/albumComments/${albumId}`
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
    return this.api.post<CommentDto>(`/Comments`, {
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
    return this.api.put<CommentDto>(`/Comments/${commentId}`, {
      text: payload.text
    }).pipe(
      map(dto => ({
        id: dto.id,
        author: dto.username,
        userId: dto.userId,
        text: dto.text,
        createdAt: dto.createdDate,
        likes: 0,
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
    return this.api.post<CommentDto>(`/Comments`, {
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
        userReaction: null
      }))
    );
  }

  /**
   * GET /v1/Comments/{id}
   * Loads a single comment
   */
  getCommentById(commentId: string): Observable<CommentDto> {
    return this.api.get<CommentDto>(`/Comments/${commentId}`);
  }

  /**
   * POST /v1/CommentLikes/{commentId}
   * Adds a like to a comment from the authenticated user
   * Idempotent - can call multiple times without creating duplicates
   */
  likeComment(commentId: string): Observable<void> {
    return this.api.post<void>(
      `/CommentLikes/${commentId}`,
      {}
    );
  }

  /**
   * DELETE /v1/CommentLikes/{commentId}
   * Removes a like from a comment by the authenticated user
   * Idempotent - no error if like doesn't exist
   */
  unlikeComment(commentId: string): Observable<void> {
    return this.api.delete<void>(
      `/CommentLikes/${commentId}`
    );
  }

  /**
   * GET /v1/CommentLikes/{commentId}/count
   * Gets the total number of likes for a specific comment
   * Does not require authentication
   */
  getCommentLikeCount(commentId: string): Observable<{ commentId: string; likeCount: number }> {
    return this.api.get<{ commentId: string; likeCount: number }>(
      `/CommentLikes/${commentId}/count`
    );
  }

  /**
   * GET /v1/CommentLikes/{commentId}/status
   * Checks if the authenticated user has liked a specific comment
   * Requires authentication
   */
  getCommentLikeStatus(commentId: string): Observable<{ commentId: string; hasLiked: boolean }> {
    return this.api.get<{ commentId: string; hasLiked: boolean }>(
      `/CommentLikes/${commentId}/status`
    );
  }

  /**
   * GET /v1/CommentLikes/{commentId}/users
   * Gets all users who have liked a specific comment
   * Does not require authentication
   */
  getCommentLikeUsers(commentId: string): Observable<Array<{
    userId: string;
    username: string;
    likedAt: string;
  }>> {
    return this.api.get<Array<{
      userId: string;
      username: string;
      likedAt: string;
    }>>(`/CommentLikes/${commentId}/users`);
  }

  /**
 * POST /v1/Ratings
 * Creates or updates a rating for an album (upsert)
 */
  createOrUpdateRating(
    albumId: string,
    ratingValue: number
  ): Observable<any> {
    return this.api.post<any>(`/Ratings`, {
      albumId,
      ratingValue
    });
  }

  /**
   * GET /v1/Ratings/albumRating/{albumId}
   * Gets all ratings for an album
   */
  getAlbumRatings(albumId: string): Observable<any[]> {
    return this.api.get<any[]>(
      `/Ratings/albumRating/${albumId}`
    );
  }

  /**
   * GET /v1/Ratings/albumRating/{albumId}/user/{userId}
   * Gets a specific user's rating for an album
   */
  getUserRating(albumId: string, userId: string): Observable<any> {
    return this.api.get<any>(
      `/Ratings/albumRating/${albumId}/user/${userId}`
    );
  }
}
