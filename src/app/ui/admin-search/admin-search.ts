import { Component, computed, input, output,
    signal, TemplateRef, ContentChild } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from "@angular/router";
import { RouterModule } from '@angular/router';

type Key = string | number;

@Component({
    selector: 'app-admin-search',
    standalone: true,
    imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatCheckboxModule,
    MatButtonModule,
    ScrollingModule,
    RouterLink,
    RouterModule
],
    templateUrl: './admin-search.html',
    styleUrls: ['./admin-search.scss']
})
export class AdminSearch {

    items = input.required<readonly unknown[]>();
    
    /** How to get a stable id from an item (default: item['id']) */
    getId = input<(item: any) => Key>((i: any) => i?.id as Key);

    /** How to render the label (default: item['username'] || item['label'] || String(item)) */
    getLabel = input<(item: any) => string>((i: any) =>
        (i?.username ?? i?.label ?? String(i))
    );

    /** Action button labels (optional) */
    primaryLabel = input<string>('Suspend Selected');
    secondaryLabel = input<string>('Warn Selected');

    /** Outputs */
    selectionChange = output<Set<Key>>();
    primary = output<Key[]>();   // e.g. suspend
    secondary = output<Key[]>(); // e.g. warn
    
    /** Optional custom row template:
    *  <app-admin-search> <ng-template let-item let-selected="selected"> ... </ng-template> </app-admin-search>
    */
    @ContentChild(TemplateRef) rowTpl?: TemplateRef<any>;

    /** Local state */
    private selection = signal<Set<Key>>(new Set());
    searchTerm = signal('');

    /** Derived filtered list */
    filtered = computed(() => {
        const q = this.searchTerm().trim().toLowerCase();
        const list = this.items() ?? [];
        if (!q) return list;
        const label = this.getLabel();
        return list.filter((it: any) => label(it).toLowerCase().includes(q));
    });

    applyFilter(ev: Event) {
        this.searchTerm.set((ev.target as HTMLInputElement).value ?? '');
    }

    isSelected(id: Key) { return this.selection().has(id); }

    toggle(id: Key, checked: boolean) {
        const next = new Set(this.selection());
        checked ? next.add(id) : next.delete(id);
        this.selection.set(next);
        this.selectionChange.emit(next);
    }

    uncheckAll() {
        this.selection.set(new Set());
        this.selectionChange.emit(this.selection());
    }

    doPrimary()  { this.primary.emit([...this.selection()]); }
    doSecondary(){ this.secondary.emit([...this.selection()]); }

    trackById = (_: number, it: any) => this.getId()(it);
}
//     searchTerm = '';
//     users: { username: string; _lower: string; selected?: boolean }[] = [];

//     // Pre-populate a huge user list
//     constructor() {
//         for (let i = 1; i <= 100; i++) {
//             const name = 'User' + i;
//             this.users.push({ username: name, _lower: name.toLowerCase(), selected: false });
//         }
//     }

//     // Filtered list (recomputes on search)
//     get filteredUsers() {
//         const query = this.searchTerm.toLowerCase();
//         if (!query) return this.users;
//         return this.users.filter(u => u._lower.includes(query));
//     }

//     applyFilter(event: Event) {
//         this.searchTerm = (event.target as HTMLInputElement).value;
//     }

//     suspendSelected() {
//         const selected = this.users.filter(u => u.selected);
//         alert('Suspending users: ' + selected.map(u => u.username).join(', '));
//         // TODO: Add actual suspend logic
//     }

//     warnSelected() {
//         const selected = this.users.filter(u => u.selected);
//         alert('Warning users: ' + selected.map(u => u.username).join(', '));
//         // TODO: Add actual warning logic
//     }

//     uncheckAll() {
//         // Clear selection for all users
//         this.users.forEach(user => user.selected = false);
//     }

// }
