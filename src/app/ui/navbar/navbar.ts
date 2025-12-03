import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AccountService } from '../../services/account.service';
import { UserAccount } from '../../models/account.models';

@Component({
  standalone: true,
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar implements OnInit {
  username: string = '';
  search = new FormControl('');

  constructor(private router: Router,
    private accountService: AccountService
  ) { }

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

  ngOnInit(): void {
    this.accountService.getAccount().subscribe((account:UserAccount) => {
      this.username = account.username;}
    );
  }
}
