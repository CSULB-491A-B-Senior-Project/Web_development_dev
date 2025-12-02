import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { UserAccount } from '../models/account.models';

@Injectable({
    providedIn: 'root'
})
export class AccountService {
    #http = inject(HttpClient);
    #apiUrl = 'https://api.crescendo.chat/v1/Users/me'; // Replace with your actual API endpoint

    getAccount(): Observable<UserAccount> {
    // In a real app, this would be: return this.#http.get<UserProfile>(this.#apiUrl);
    // For now, we return mock data.
        return this.#http.get<UserAccount>(this.#apiUrl);
    }
}

    // updateFirstName(firstName: string): Observable<void> {
    //     return this.#http.patch<void>(`${this.#apiUrl}/firstName`, { firstName });
    // }
