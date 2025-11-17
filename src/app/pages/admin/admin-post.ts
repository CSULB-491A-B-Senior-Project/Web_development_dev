import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminSearch } from '../../ui/admin-search/admin-search';

type User = {
    id: number;
    username: string;
    review: string;
};

@Component({
    standalone: true,
    selector: 'app-admin-post',
    imports: [CommonModule, AdminSearch],
    templateUrl: './admin-post.html',
})
export class AdminPost {
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
        username: 'username',
        review: 'This is a spam post.'
    },
    {
        id: 2,
        username: 'another_user',
        review: 'This is an inappropriate post.'
    },
    {
        id: 3,
        username: 'another_user',
        review: 'This post contains spam content.'
    },
    {
        id: 4,
        username: 'another_user 123',
        review: 'This post violates community guidelines.'
    },
    {
        id: 5,
        username: 'another_use12r',
        review: 'This post has offensive language.'
    },
    ]);

    // define the functions as class members
    getId = (u: User) => u.id;
    getLabel = (u: User) => [u.username, u.review].filter(Boolean).join(' — ');

    onWarn = (ids: (string|number)[]) =>
    alert('Warning user ids: ' + ids.join(', '));

    onDelete = (ids: (string|number)[]) =>
    alert('Deleting user ids: ' + ids.join(', '));
}
