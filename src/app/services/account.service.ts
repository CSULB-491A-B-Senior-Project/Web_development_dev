import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../api.service';

import { Artist, Album } from '../models/playlist.models';
import { UserAccount } from '../models/account.models';

@Injectable({
    providedIn: 'root'
})
export class AccountService {
    constructor(private api: ApiService) {}

    getAccount(): Observable<UserAccount> {
        return this.api.get<UserAccount>('/Users/me');
    }
    updateAccount(account: Partial<UserAccount>): Observable<UserAccount> {
        return this.api.put<UserAccount>('/Users/me', account);
    }
    changePassword(oldPassword: string, newPassword: string): Observable<void> {
        return this.api.put<void>('/Users/me/password', {
            currentPassword: oldPassword,
            newPassword: newPassword });
    }
    getFavoriteSong(id: string): Observable<any> {
        return this.api.get<any>(`/Tracks/${id}`);
    }
    favoriteArtists(): Observable<Artist[]> {
        return this.api.get<Artist[]>('/Users/me/favorite-artists/');
    }
    favoriteAlbums(): Observable<Album[]> {
        return this.api.get<Album[]>('/Users/me/favorite-albums/');
    }
}
