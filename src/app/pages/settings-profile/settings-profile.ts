import { ChangeDetectionStrategy, Component, ElementRef, AfterViewInit, inject, signal, viewChild, computed, DestroyRef } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { of, take } from 'rxjs';

import { ProfileService } from '../../services/profile.service';
import { MusicSearchService } from '../../services/music-search.service';
import { Artist, Album, Song } from '../../models/music.models';
import { CdkDropList, CdkDrag, CdkDragHandle, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpClient } from '@angular/common/http';

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
  #nfb = inject(NonNullableFormBuilder); // added for non-nullable controls
  #profileService = inject(ProfileService);
  #musicSearchService = inject(MusicSearchService);
  #http = inject(HttpClient);

  // Signals
  profilePictureUrl = signal<string>('/assets/default-profile.png');
  profilePicFileName = signal<string>(''); // display selected profile picture file name
  private localBlobUrl = signal<string | null>(null);

  selectedFileName = signal('');
  favoriteArtists = signal<Artist[]>([]);
  favoriteAlbums = signal<Album[]>([]);
  favoriteSong = signal<Song | null>(null);

  // NEW: track locally unhearted albums so they stay visible but show unhearted
  unheartedAlbumIds = signal<Set<string>>(new Set());

  // Helper for template and logic
  isAlbumUnhearted(album: Album): boolean {
    return this.unheartedAlbumIds().has(album.id);
  }

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

  // Forms (non-nullable to avoid null after reset)
  bioForm = this.#nfb.group({ bio: ['', [Validators.maxLength(150)]] });
  songSearchForm = this.#nfb.group({ query: '' });
  artistSearchForm = this.#nfb.group({ query: '' });
  albumSearchForm = this.#nfb.group({ query: '' });

  // ViewChild
  bioTextarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('bioTextarea');

  // Loading and error signals
  loadingSongSearch = signal(false);
  loadingAlbumSearch = signal(false);
  songSearchError = signal<string | null>(null);
  albumSearchError = signal<string | null>(null);

  constructor() {
    this.#profileService.getProfile().pipe(take(1)).subscribe(p => {
      const bio = p.bio ?? '';
      this.bioForm.patchValue({ bio }, { emitEvent: false });
      this.bioForm.markAsPristine();
      this.profilePictureUrl.set(p.profilePictureUrl);
      this.favoriteSong.set(p.favoriteSong);
      this.favoriteArtists.set(p.favoriteArtists);
      this.favoriteAlbums.set(p.favoriteAlbums);
    });

    const destroyRef = inject(DestroyRef);

    // SONG search pipeline
    const songSub = this.songSearchForm.controls.query.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(v => { this.songSearchQuery.set(v); this.loadingSongSearch.set(!!v.trim()); this.songSearchError.set(null); }),
      switchMap(term => term.trim()
        ? this.#musicSearchService.searchSongs(term).pipe(take(1))
        : of<Song[]>([])
      )
    ).subscribe({
      next: res => { this.songResults.set(res); this.loadingSongSearch.set(false); },
      error: () => { this.songResults.set([]); this.songSearchError.set('Search failed'); this.loadingSongSearch.set(false); }
    });

    // ALBUM search pipeline
    const albumSub = this.albumSearchForm.controls.query.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(v => { this.albumSearchQuery.set(v); this.loadingAlbumSearch.set(!!v.trim()); this.albumSearchError.set(null); }),
      switchMap(raw => {
        const term = raw.trim();
        return term ? this.#musicSearchService.searchAlbums(term).pipe(take(1)) : of<Album[]>([]);
      })
    ).subscribe({
      next: res => {
        const term = this.albumSearchQuery().trim().toLowerCase();
        const filtered = res.filter(a => {
          if (!term) return true;
          const name = a.name.toLowerCase();
          const artist = a.artist.artistName.toLowerCase();
          return name.includes(term) || artist.includes(term);
        });
        this._albumResultsRaw.set(filtered);
        this.loadingAlbumSearch.set(false);
      },
      error: () => {
        this._albumResultsRaw.set([]);
        this.albumSearchError.set('Search failed');
        this.loadingAlbumSearch.set(false);
      }
    });

    destroyRef.onDestroy(() => {
      songSub.unsubscribe();
      albumSub.unsubscribe();
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.autoResizeBio(), 0);
  }

  autoResizeBio(): void {
    const el = this.bioTextarea()?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  // Profile picture
  onProfilePictureSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.profilePicFileName.set('');
      return;
    }

    // validate type/size
    const validType = /^image\/(png|jpe?g|webp)$/i.test(file.type);
    const validSize = file.size <= 3 * 1024 * 1024; // 3MB max
    this.profilePicFileName.set(file.name);

    if (!validType || !validSize) {
      // optionally set an error signal; keep name visible for feedback
      input.value = '';
      return;
    }

    // preview via blob URL
    const blobUrl = URL.createObjectURL(file);
    this.profilePictureUrl.set(blobUrl);

    // upload to server (replace endpoint if different)
    const form = new FormData();
    form.append('image', file);

    this.#http.post<{ url: string }>('/api/profile/image', form).subscribe({
      next: ({ url }) => {
        // cache-bust to ensure fresh image
        this.profilePictureUrl.set(url + '?v=' + Date.now());
      },
      error: () => {
        // keep local preview or show error message
      }
    });

    // allow re-selecting the same file
    input.value = '';
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
    // auto-persist
    this.#http.post('/api/profile/favorite-song', { songId: song.id }).subscribe({
      error: () => {
        // optional: revert on failure
        // this.favoriteSong.set(null);
      }
    });
  }

  clearFavoriteSong(): void {
    this.favoriteSong.set(null);
    this.#http.post('/api/profile/favorite-song', { songId: null }).subscribe();
  }

  // Artists
  addArtistToFavorites(artist: Artist): void {
    if (this.favoriteArtists().some(a => a.id === artist.id)) return;
    const updated = [artist, ...this.favoriteArtists().filter(a => a.id !== artist.id)];
    this.favoriteArtists.set(updated);
    this.artistSearchForm.controls.query.setValue(''); // replace reset()
    this._artistResultsRaw.set([]);
    this.#profileService.updateFavoriteArtists(updated).pipe(take(1)).subscribe();
  }

  removeArtistFromFavorites(artist: Artist): void {
    const updated = this.favoriteArtists().filter(a => a.id !== artist.id);
    this.favoriteArtists.set(updated);
    this.#profileService.updateFavoriteArtists(updated).pipe(take(1)).subscribe();
  }

  // Albums
  addAlbumToFavorites(album: Album): void {
    // Clear local unhearted state so heart shows as ON
    this.unheartedAlbumIds.update(prev => {
      if (!prev.has(album.id)) return prev;
      const next = new Set(prev);
      next.delete(album.id);
      return next;
    });

    // If already in the local list, just persist current list to server
    const existsLocally = this.favoriteAlbums().some(a => a.id === album.id);
    if (existsLocally) {
      this.#profileService.updateFavoriteAlbums(this.favoriteAlbums()).pipe(take(1)).subscribe();
      return;
    }

    // Add to local list and persist
    const updated = [album, ...this.favoriteAlbums().filter(a => a.id !== album.id)];
    this.favoriteAlbums.set(updated);
    this.#profileService.updateFavoriteAlbums(updated).pipe(take(1)).subscribe();
  }

  removeAlbumFromFavorites(album: Album): void {
    // Mark unhearted locally (keep visible)
    this.unheartedAlbumIds.update(prev => {
      if (prev.has(album.id)) return prev;
      const next = new Set(prev);
      next.add(album.id);
      return next;
    });

    // Persist removal to server (exclude album)
    const serverUpdated = this.favoriteAlbums().filter(a => a.id !== album.id);
    this.#profileService.updateFavoriteAlbums(serverUpdated).pipe(take(1)).subscribe();

    const q = this.albumSearchForm.controls.query.value.trim();
    if (q) {
      this.#musicSearchService.searchAlbums(q).pipe(take(1)).subscribe(res => {
        const term = q.toLowerCase();
        const filtered = res.filter(a => {
          const name = a.name.toLowerCase();
          const artist = a.artist.artistName.toLowerCase();
          return name.includes(term) || artist.includes(term);
        });
        this._albumResultsRaw.set(filtered);
      });
    }
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

  // cleanup blob URL on destroy
  private destroyRef = inject(DestroyRef);
  ngOnDestroy() {
    const prev = this.localBlobUrl();
    if (prev) URL.revokeObjectURL(prev);
  }
}