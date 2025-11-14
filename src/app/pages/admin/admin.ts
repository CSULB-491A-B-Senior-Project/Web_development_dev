import { Component } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-admin',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatListModule,
        MatCheckboxModule,
        MatButtonModule,
        ScrollingModule
    ],
    templateUrl: './admin.html',
    styleUrls: ['./admin.scss']
})
export class Admin {

    searchTerm = '';
    users: { username: string; _lower: string; selected?: boolean }[] = [];

    // Pre-populate a huge user list
    constructor() {
        for (let i = 1; i <= 200000; i++) {
            const name = 'User' + i;
            this.users.push({ username: name, _lower: name.toLowerCase(), selected: false });
        }
    }

    // Filtered list (recomputes on search)
    get filteredUsers() {
        const query = this.searchTerm.toLowerCase();
        if (!query) return this.users;
        return this.users.filter(u => u._lower.includes(query));
    }

    applyFilter(event: Event) {
        this.searchTerm = (event.target as HTMLInputElement).value;
    }

    suspendSelected() {
        const selected = this.users.filter(u => u.selected);
        alert('Suspending users: ' + selected.map(u => u.username).join(', '));
        // TODO: Add actual suspend logic
    }

    warnSelected() {
        const selected = this.users.filter(u => u.selected);
        alert('Warning users: ' + selected.map(u => u.username).join(', '));
        // TODO: Add actual warning logic
    }

    uncheckAll() {
        // Clear selection for all users
        this.users.forEach(user => user.selected = false);
    }

}
