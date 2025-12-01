import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Admin } from '../../ui/admin/admin';

type User = {
    id: number;
    username: string;
    email: string;
};

@Component({
    standalone: true,
    selector: 'app-admin-user',
    imports: [CommonModule, Admin],
    templateUrl: './admin-user.html',
})
export class AdminUser {

    items = signal<User[]>([
    {
        id: 1,
        username: 'username',
        email: 'example@gmail.com'
    },
    {
        id: 2,
        username: 'another_user',
        email: 'example@gmail.com'
    },
    {
        id: 3,
        username: 'another_user',
        email: 'example@gmail.com'
    },
    {
        id: 4,
        username: 'another_user 123',
        email: 'example@gmail.com'
    },
    {
        id: 5,
        username: 'another_use12r',
        email: 'example@gmail.com'
    },
    ]);
    
    // define the functions as class members
    getId = (u: User) => u.id;
    getLabel = (u: User) => [u.username, u.email].filter(Boolean).join(' — ');

    onSuspend = (ids: (string|number)[]) =>
    alert('Suspending user ids: ' + ids.join(', '));

    onWarn = (ids: (string|number)[]) =>
    alert('Warning user ids: ' + ids.join(', '));
}
