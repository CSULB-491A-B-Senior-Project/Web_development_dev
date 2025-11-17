import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar {
  search = new FormControl('');

  constructor(private router: Router) { }

  onSearchKeypress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.performSearch();
    }
  }

  performSearch() {
    const query = this.search.value?.trim();
    if (query) {
      this.router.navigate(['/search'], {
        queryParams: { q: query }
      });
    }
  }
}
