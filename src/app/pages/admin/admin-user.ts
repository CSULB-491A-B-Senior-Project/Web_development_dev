import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminSearch } from '../../ui/admin-search/admin-search';

type User = {
    id: number;
    username: string;
};

@Component({
    standalone: true,
    selector: 'app-admin-user',
    imports: [CommonModule, AdminSearch],
    templateUrl: './admin-user.html',
})
export class AdminUser {
    // Pre-populated list to insert into admin search
    // constructor() {
    //     for (let i = 1; i <= 100; i++) {
    //         const name = 'User' + i;
    //         this.users.push({ username: name, _lower: name.toLowerCase(), selected: false });
    //     }
    // }

    items = signal<User[]>([
    {
        id: 1,
        username: 'username'
    },
    {
        id: 2,
        username: 'another_user'
    },
    {
        id: 3,
        username: 'another_user'
    },
    {
        id: 4,
        username: 'another_user 123'
    },
    {
        id: 5,
        username: 'another_use12r'
    },
    ]);
    
    // define the functions as class members
    getId = (u: User) => u.id;
    getLabel = (u: User) => u.username;

    onSuspend = (ids: (string|number)[]) =>
    alert('Suspending user ids: ' + ids.join(', '));

    onWarn = (ids: (string|number)[]) =>
    alert('Warning user ids: ' + ids.join(', '));
}
