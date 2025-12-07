// src/app/services/user-follows.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

@Injectable({ providedIn: 'root' })
export class FollowService {
    constructor(private api: ApiService) {}

  // POST /v1/UserFollows/{targetUserId}
    follow(targetUserId: string): Observable<void> {
        return this.api.post<void>('/UserFollows/${targetUserId}', {});
    }

    // DELETE /v1/UserFollows/{targetUserId}
    unfollow(targetUserId: string): Observable<void> {
        return this.api.delete<void>('/UserFollows/${targetUserId}');
    }

    // GET /v1/UserFollows/following/{userId}
    getFollowing(userId: string): Observable<any[]> {
        return this.api.get<any[]>('/UserFollows/following/${userId}');
    }

    // GET /v1/UserFollows/followers/{userId}
    getFollowers(userId: string): Observable<any[]> {
        return this.api.get<any[]>('/UserFollows/followers/${userId}');
    }
}
