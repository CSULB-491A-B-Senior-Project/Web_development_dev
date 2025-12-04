import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserAccount } from '../models/account.models';
import { ApiService } from '../api.service';

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
}
