import { Component, OnInit, inject, signal, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AccountService } from '../../services/account.service';
import { PlaylistCreatorService } from '../../services/playlist.service';
import { ProfileService } from '../../services/profile.service';
import { ProfilePictureStore } from './profile-picture.store';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink, ReactiveFormsModule, NgOptimizedImage],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Navbar implements OnInit {
  username = signal<string>('');
  search = new FormControl<string>('');
  pictureStore = inject(ProfilePictureStore);

  private router = inject(Router);
  private accountService = inject(AccountService);
  private playlistCreatorService = inject(PlaylistCreatorService);
  private profileService = inject(ProfileService);

  ngOnInit(): void {
    console.log('[Navbar] ngOnInit');

    this.accountService.getAccount().subscribe({
      next: acc => this.username.set(acc?.username ?? ''),
      error: err => console.error('[Navbar] account load error', err)
    });

    // Fetch authenticated profile once and normalize in the store
    this.profileService.getProfile().subscribe({
      next: profile => {
        console.log('[Navbar] getProfile() -> pushing to store');
        this.pictureStore.setFromProfileOnce(profile);
      },
      error: err => console.error('[Navbar] profile load error', err)
    });

    // Optional: observe changes
    effect(() => {
      console.log('[Navbar] avatar URL =', this.pictureStore.profilePictureUrl());
    });
  }

  onSearchKeypress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.performSearch();
    }
  }

  performSearch() {
    const query = this.search.value?.trim();
    if (query) {
      this.router.navigate(['/search'], { queryParams: { q: query } });
    }
  }

  openPlaylistCreator(event: Event): void {
    event.preventDefault();
    this.playlistCreatorService.openCreator();
  }
}