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
}
