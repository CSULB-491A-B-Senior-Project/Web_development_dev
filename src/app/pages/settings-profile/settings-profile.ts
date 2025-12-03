import { ChangeDetectionStrategy, Component, ElementRef, AfterViewInit, inject, signal, viewChild, computed } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { of, take } from 'rxjs';

import { ProfileService } from '../../services/profile.service';
import { MusicSearchService } from '../../services/music-search.service';
import { Artist, Album, Song } from '../../models/music.models';
import { CdkDropList, CdkDrag, CdkDragHandle, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ApiService } from '../../api.service';

@Component({
  selector: 'app-settings-profile',
  templateUrl: './settings-profile.html',
  styleUrl: './settings-profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    NgOptimizedImage,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
  ],
})
export class SettingsProfile implements AfterViewInit {
  #fb = inject(FormBuilder);
  #profileService = inject(ProfileService);
  #musicSearchService = inject(MusicSearchService);

  // Signals
  profilePictureUrl = signal('/assets/default-avatar.png');
  selectedFileName = signal('');
  favoriteArtists = signal<Artist[]>([]);
  favoriteAlbums = signal<Album[]>([]);
  favoriteSong = signal<Song | null>(null);

  songResults = signal<Song[]>([]);

  // Raw search result signals
  private _artistResultsRaw = signal<Artist[]>([]);
  private _albumResultsRaw = signal<Album[]>([]);

  // Filtered (display) results exclude already favorited items
  artistResults = computed(() => {
    const favoriteIds = new Set(this.favoriteArtists().map(a => a.id));
    return this._artistResultsRaw().filter(a => !favoriteIds.has(a.id));
  });
  albumResults = computed(() => {
    const favoriteIds = new Set(this.favoriteAlbums().map(a => a.id));
    return this._albumResultsRaw().filter(a => !favoriteIds.has(a.id));
  });

  songSearchQuery = signal('');
  artistSearchQuery = signal('');
  albumSearchQuery = signal('');

  // Forms
  bioForm = this.#fb.group({ bio: ['', [Validators.maxLength(150)]] });
  songSearchForm = this.#fb.group({ query: [''] });
  artistSearchForm = this.#fb.group({ query: [''] });
  albumSearchForm = this.#fb.group({ query: [''] });

  // ViewChild
  bioTextarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('bioTextarea');

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {
    this.#profileService.getProfile().pipe(take(1)).subscribe(p => {
      this.bioForm.patchValue({ bio: p.bio });
      this.profilePictureUrl.set(p.profilePictureUrl);
      this.favoriteSong.set(p.favoriteSong);
      this.favoriteArtists.set(p.favoriteArtists);
      this.favoriteAlbums.set(p.favoriteAlbums);
    });

    // Song search (no filtering requested)
    this.songSearchForm.controls.query.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(v => this.songSearchQuery.set(v ?? '')),
      switchMap(term => term?.trim() ? this.#musicSearchService.searchSongs(term) : of([]))
    ).subscribe(res => this.songResults.set(res));

    // Artist search (raw -> filtered via computed)
    this.artistSearchForm.controls.query.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(v => this.artistSearchQuery.set(v ?? '')),
      switchMap(term => term?.trim() ? this.#musicSearchService.searchArtists(term) : of([]))
    ).subscribe(res => this._artistResultsRaw.set(res));

    // Album search (raw -> filtered via computed)
    this.albumSearchForm.controls.query.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(v => this.albumSearchQuery.set(v ?? '')),
      switchMap(term => term?.trim() ? this.#musicSearchService.searchAlbums(term) : of([]))
    ).subscribe(res => this._albumResultsRaw.set(res));
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.autoResizeBio(), 0);
  }

  onLogout(): void {
    this.apiService.logout();
    this.router.navigate(['/login']);
  }

  autoResizeBio(): void {
    const el = this.bioTextarea()?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  // Profile picture
  onProfilePictureSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.#profileService.uploadProfilePicture(file).pipe(take(1)).subscribe(r => {
      this.profilePictureUrl.set(r.url);
    });
  }

  // Background image
  onFileSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.selectedFileName.set(file.name);
    this.#profileService.uploadBackgroundImage(file).pipe(take(1)).subscribe();
  }

  // Bio
  onBioSubmit(): void {
    if (this.bioForm.invalid) return;
    const bio = this.bioForm.value.bio ?? '';
    this.#profileService.updateBio(bio).pipe(take(1)).subscribe();
  }

  // Song favorites
  selectSong(song: Song): void {
    this.favoriteSong.set(song);
    this.songSearchForm.reset();
    this.songResults.set([]);
  }

  clearFavoriteSong(): void {
    this.favoriteSong.set(null);
  }

  saveFavoriteSong(): void {
    this.#profileService.updateFavoriteSong(this.favoriteSong()).pipe(take(1)).subscribe();
  }

  // Artists
  addArtistToFavorites(artist: Artist): void {
    if (this.favoriteArtists().some(a => a.id === artist.id)) return;
    const updated = [artist, ...this.favoriteArtists().filter(a => a.id !== artist.id)];
    this.favoriteArtists.set(updated);
    this.artistSearchForm.reset();
    this._artistResultsRaw.set([]); // Clear list after adding
    this.#profileService.updateFavoriteArtists(updated).pipe(take(1)).subscribe();
  }

  removeArtistFromFavorites(artist: Artist): void {
    const updated = this.favoriteArtists().filter(a => a.id !== artist.id);
    this.favoriteArtists.set(updated);
    this.#profileService.updateFavoriteArtists(updated).pipe(take(1)).subscribe();
  }

  // Albums
  addAlbumToFavorites(album: Album): void {
    if (this.favoriteAlbums().some(a => a.id === album.id)) return;
    const updated = [album, ...this.favoriteAlbums().filter(a => a.id !== album.id)];
    this.favoriteAlbums.set(updated);
    this.albumSearchForm.reset();
    this._albumResultsRaw.set([]); // Clear list after adding
    this.#profileService.updateFavoriteAlbums(updated).pipe(take(1)).subscribe();
  }

  removeAlbumFromFavorites(album: Album): void {
    const updated = this.favoriteAlbums().filter(a => a.id !== album.id);
    this.favoriteAlbums.set(updated);
    this.#profileService.updateFavoriteAlbums(updated).pipe(take(1)).subscribe();
  }

  // Computed slice for top 10 (unchanged)
  topTenFavoriteArtists = computed(() => this.favoriteArtists().slice(0, 10));

  // Replace previous drop handler with this:
  dropFavoriteArtist(event: CdkDragDrop<Artist[]>) {
    // Work on a copy
    const current = this.favoriteArtists();
    const top = [...current.slice(0, 10)];
    moveItemInArray(top, event.previousIndex, event.currentIndex);
    const updated = [...top, ...current.slice(10)];

    // Update signal first for instant UI
    this.favoriteArtists.set(updated);

    // Persist immediately
    this.#profileService.updateFavoriteArtists(updated).pipe(take(1)).subscribe();
  }
}