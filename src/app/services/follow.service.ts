// src/app/services/user-follows.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

interface FollowStatusResponse {
  artistId: string;
  isFollowing: boolean;
}

@Injectable({ providedIn: 'root' })
export class FollowService {
    constructor(private api: ApiService) {}

    // ARTIST
    // POST - FOLLOW ARTIST
    followArtist(artistId: string): Observable<void> {
        return this.api.post<void>(`/UserFollows/artist/${artistId}`, {});
    }
    // DELETE - UNFOLLOW ARTIST
    unfollowArtist(artistId: string): Observable<void> {
        return this.api.delete<void>(`/UserFollows/artist/${artistId}`);
    }
    // GET - LIST OF ARTISTS THE USER FOLLOWS
    getUserArtistFollowList(userId: string): Observable<any[]> {
        return this.api.get<any[]>(`/UserFollows/artist/following/${userId}`);
    }
    // GET - LIST OF USERS FOLLOWING THE ARTIST
    getArtistFollowList(artistId: string): Observable<any[]> {
        return this.api.get<any[]>(`/UserFollows/artist/followers/${artistId}`);
    }
    // GET - TOTAL NUMBER OF FOLLOWERS FOR AN ARTIST
    getArtistFollowCount(artistId: string): Observable<number> {
        return this.api.get<number>(`/UserFollows/artist/${artistId}/count`);
    }
    // GET - CHECK IF THE CURRENT USER FOLLOWS THE ARTIST
    isFollowingArtist(artistId: string): Observable<FollowStatusResponse> {
        return this.api.get<FollowStatusResponse>(`/UserFollows/artist/${artistId}/status`);
    }

    // USERS
    getUserFollowCount(userId: string): Observable<any[]> {
        return this.api.get<any[]>(`/UserFollows/artist/following/${userId}`);
    }
}
