import { ChangeDetectionStrategy, Component, ElementRef, AfterViewInit, inject, signal, viewChild, computed, DestroyRef } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, tap, catchError, map } from 'rxjs/operators';
import { of, from, forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ProfileService } from '../../services/profile.service';
import { MusicSearchService } from '../../services/music-search.service';
import { SearchService, SearchItem } from '../../services/search.service';
import { ArtistService } from '../../services/artist.service';
import { AlbumReviewsService } from '../../services/album-reviews.service';
import { Artist, Album, Song } from '../../models/music.models';
import { CdkDropList, CdkDrag, CdkDragHandle, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ApiService } from '../../api.service';
import { environment } from '../../../environments/environment';

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
  // Injectors and services
  #nfb = inject(NonNullableFormBuilder);
  #profileService = inject(ProfileService);
  #searchService = inject(SearchService);
  #musicSearchService = inject(MusicSearchService);
  #artistService = inject(ArtistService);
  #albumReviews = inject(AlbumReviewsService);
  #http = inject(HttpClient);
  #apiService = inject(ApiService);

  // API base
  private apiBase = (environment.apiBaseUrl ?? '').replace(/\/$/, '');

  // Placeholders (use dedicated album/artist placeholders)
  readonly placeholderArtist = '/assets/default-artist.png';
  readonly placeholderAlbum = '/assets/default-album.png';

  // Signals
  profilePictureUrl = signal<string>('/assets/default-profile.png');
  profilePicFileName = signal<string>('');
  private localBlobUrl = signal<string | null>(null);

  selectedFileName = signal('');
  favoriteArtists = signal<Artist[]>([]);
  favoriteAlbums = signal<Album[]>([]);
  favoriteSong = signal<Song | null>(null);

  // Track locally unhearted albums so they remain visible but appear "removed"
  unheartedAlbumIds = signal<Set<string>>(new Set());

  // Helpers
  isAlbumUnhearted(album: Album): boolean {
    return this.unheartedAlbumIds().has(album.id);
  }

  // Resolve absolute URL for profile images (supports absolute, blob:, data:, and relative paths)
  private resolveImageUrl(raw?: unknown): string {
    const placeholder = '/assets/default-profile.png';
    const v = (raw ?? '').toString().trim();
    if (!v) return placeholder;
    if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('blob:') || v.startsWith('data:')) return v;
    const base = this.apiBase || window.location.origin;
    if (v.startsWith('/')) return `${base}${v}`;
    return `${base}/${v}`;
  }

  // Normalizes various backend album shapes into the Album interface used by the template
  private normalizeAlbumFromApi(a: unknown): Album {
    const src = a as Record<string, unknown>;
    const id = (src['albumId'] as string) ?? (src['id'] as string) ?? '';
    const name = (src['albumName'] as string) ?? (src['title'] as string) ?? (src['name'] as string) ?? '';

    const artistName =
      (typeof src['artistName'] === 'string' ? src['artistName'] as string : undefined) ??
      (typeof src['username'] === 'string' ? src['username'] as string : undefined) ??
      '';

    const coverRaw = src['albumImageUrl'] ?? src['imageUrl'] ?? src['coverArt'] ?? src['albumCover'] ?? '';
    const albumCover = this.resolveImageUrl(coverRaw);

    const releaseDate = src['releaseDate'] ?? src['year'] ?? src['releaseYear'] ?? src['dateLabel'];
    const year =
      typeof releaseDate === 'number'
        ? releaseDate
        : typeof releaseDate === 'string'
          ? (Number.isNaN(new Date(releaseDate).getTime())
              ? Number.parseInt(releaseDate, 10) || undefined
              : new Date(releaseDate).getFullYear())
          : undefined;

    return { id, name, albumCover: albumCover || this.placeholderAlbum, artist: { artistName }, releaseYear: year } as Album;
  }

  // Search results
  songResults = signal<Song[]>([]);
  private _artistResultsRaw = signal<Artist[]>([]);
  private _albumResultsRaw = signal<Album[]>([]);

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
  bioForm = this.#nfb.group({
    bio: ['', [Validators.maxLength(150)]]
  });
  songSearchForm = this.#nfb.group({ query: '' });
  artistSearchForm = this.#nfb.group({ query: '' });
  albumSearchForm = this.#nfb.group({ query: '' });

  // ViewChild
  bioTextarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('bioTextarea');

  // Loading / errors
  loadingSongSearch = signal(false);
  loadingAlbumSearch = signal(false);
  songSearchError = signal<string | null>(null);
  albumSearchError = signal<string | null>(null);

  // DestroyRef for cleanup
  private destroyRef = inject(DestroyRef);

  private toYear(raw: unknown): number | undefined {
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return d.getFullYear();
      const n = Number.parseInt(raw, 10);
      return Number.isNaN(n) ? undefined : n;
    }
    if (raw instanceof Date) return raw.getFullYear();
    return undefined;
  }

  private enrichFavoriteAlbumsViaDetails(albums: Album[]): void {
    const ids = albums.map(a => a.id).filter(Boolean);
    if (!ids.length) return;

    const requests = ids.map(id =>
      this.#albumReviews.getAlbumById(id).pipe(catchError(() => of(null)))
    );

    forkJoin(requests).pipe(take(1)).subscribe(detailsList => {
      const byId = new Map<string, any>();
      detailsList.forEach((d: any) => {
        const did = d?.id ?? d?.albumId ?? d?.spotifyAlbumId;
        if (did) byId.set(did, d);
      });

      const merged = albums.map(a => {
        const d = byId.get(a.id);
        // Fallback: try matching by name+artist if IDs differ
        const match = d ?? detailsList.find((x: any) =>
          (x?.albumName ?? x?.name)?.toString().toLowerCase() === (a.name ?? '').toLowerCase() &&
          (x?.artistName ?? x?.artist?.artistName ?? '').toString().toLowerCase() === (a.artist?.artistName ?? '').toLowerCase()
        );

        if (!match) return a;

        const rawYear = match.releaseYear ?? match.year ?? match.releaseDate ?? match.dateLabel;
        const year = this.toYear(rawYear);

        const cover = this.resolveImageUrl(
          match.albumImageUrl ?? match.imageUrl ?? match.coverArt ?? match.albumCover
        );
        const name = match.albumName ?? match.title ?? match.name ?? a.name;

        return {
          ...a,
          name,
          releaseYear: a.releaseYear ?? year,
          albumCover: a.albumCover || cover
        };
      });

      this.favoriteAlbums.set(merged);
    });
  }

  private currentUserKey = 'me';

  private storageKey(kind: 'profile' | 'bg') {
    return `crescendo:${kind}:filename:${this.currentUserKey}`;
  }
  private persistFileName(kind: 'profile' | 'bg', name: string) {
    try { localStorage.setItem(this.storageKey(kind), JSON.stringify({ name, t: Date.now() })); } catch { /* ignore */ }
  }
  private readPersistedFileName(kind: 'profile' | 'bg'): string {
    try {
      const raw = localStorage.getItem(this.storageKey(kind));
      const obj = raw ? JSON.parse(raw) as { name?: string } : null;
      return obj?.name ?? '';
    } catch { return ''; }
  }

  constructor(private router: Router) {
    // Load profile and favorites
    this.#profileService.getProfile().pipe(take(1)).subscribe({
      next: (p: any) => {
        console.log('profile response', p);
        // derive a stable local-storage key per user
        this.currentUserKey = String(p?.id ?? p?.userId ?? p?.username ?? 'me');
        const bio = p.bio ?? '';
        this.bioForm.patchValue({ bio }, { emitEvent: false });
        this.bioForm.markAsPristine();

        // Map backend fields defensively and resolve absolute URL
        const url = this.resolveImageUrl(
          p.profilePictureUrl ?? p.profileImageUrl ?? p.avatarUrl ?? p.picture ?? p.imageUrl ?? p.profilePicture
        );
        this.profilePictureUrl.set(url);

        this.favoriteSong.set(p.favoriteSong ?? null);

        // Normalize favorite artists
        const artists = (p.favoriteArtists ?? []).map((a: any) => ({
          id: a.id,
          artistName: a.artistName ?? a.name ?? '',
          artistImage: a.artistImage ?? a.imageUrl ?? this.placeholderArtist
        } as Artist));
        this.favoriteArtists.set(artists);

        // Normalize favorite albums using helper
        const albums = (p.favoriteAlbums ?? []).map((al: any) => this.normalizeAlbumFromApi(al));
        this.favoriteAlbums.set(albums);
        console.log('favoriteAlbums (from profile):', this.favoriteAlbums());

        this.profilePicFileName.set(this.readPersistedFileName('profile')); // restore persisted file name
        this.selectedFileName.set(this.readPersistedFileName('bg'));       // restore bg file name
      },
      error: (err) => console.error('Failed to load profile', err)
    });

    // Load favorite artists (fallback / refresh)
    this.#profileService.getFavoriteArtists().pipe(take(1)).subscribe({
      next: (artists) => {
        if (artists && artists.length) {
          this.favoriteArtists.set(artists.map(a => ({
            id: a.id,
            artistName: a.artistName ?? '',
            artistImage: a.artistImage ?? this.placeholderArtist
          })));
        }
      },
      error: (err) => console.error('Failed to load favorite artists', err)
    });

    // Load favorite albums (do not overwrite if empty), then enrich from catalog
    this.#profileService.getFavoriteAlbums().pipe(take(1)).subscribe({
      next: (albums) => {
        if (albums && albums.length) {
          const normalized = (albums as unknown[]).map(a => this.normalizeAlbumFromApi(a));
          this.favoriteAlbums.set(normalized);

          // Only use detail enrichment to populate year/cover
          this.enrichFavoriteAlbumsViaDetails(normalized);
        } else {
          console.log('getFavoriteAlbums returned empty, keeping existing favoriteAlbums');
        }
      },
      error: (err) => console.error('Failed to load favorite albums', err)
    });

    // SONG search pipeline
    const songSub = this.songSearchForm.controls.query.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(v => { this.songSearchQuery.set(v); this.loadingSongSearch.set(!!v?.toString().trim()); this.songSearchError.set(null); }),
      switchMap(term => {
        const t = (term ?? '').toString().trim();
        return t ? this.#musicSearchService.searchSongs(t).pipe(take(1)) : of<Song[]>([]);
      })
    ).subscribe({
      next: res => { this.songResults.set(res); this.loadingSongSearch.set(false); },
      error: () => { this.songResults.set([]); this.songSearchError.set('Search failed'); this.loadingSongSearch.set(false); }
    });

    // ALBUM search pipeline using SearchService
    const albumSub = this.albumSearchForm.controls.query.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(v => { this.albumSearchQuery.set(v); this.loadingAlbumSearch.set(!!v?.toString().trim()); this.albumSearchError.set(null); }),
      switchMap(raw => {
        const term = (raw ?? '').toString().trim();
        return term
          ? this.#searchService.search({ query: term, tab: 'albums', page: 1, pageSize: 20 }).pipe(take(1))
          : of<{ items: SearchItem[]; total: number }>({ items: [], total: 0 });
      })
    ).subscribe({
      next: (res: { items: SearchItem[]; total: number }) => {
        const albums = (res.items || [])
          .filter(it => it.type === 'album')
          .map(it => this.normalizeAlbumFromApi({
            id: it.id,
            albumName: it.title,
            albumImageUrl: it.imageUrl,
            artistName: it.username, // comes from transformAlbums
            releaseDate: it.dateLabel
          }));
        this._albumResultsRaw.set(albums);
        this.loadingAlbumSearch.set(false);
      },
      error: () => {
        this._albumResultsRaw.set([]);
        this.albumSearchError.set('Search failed');
        this.loadingAlbumSearch.set(false);
      }
    });

    // ARTIST search pipeline using SearchService
    const artistSub = this.artistSearchForm.controls.query.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(v => { this.artistSearchQuery.set(v); }),
      switchMap(raw => {
        const term = (raw ?? '').toString().trim();
        return term
          ? this.#searchService.search({ query: term, tab: 'artists', page: 1, pageSize: 20 }).pipe(take(1))
          : of<{ items: any[]; total: number }>({ items: [], total: 0 });
      })
    ).subscribe({
      next: res => {
        const artists = (res.items || []).filter((it: SearchItem) => it.type === 'artist').map((it: SearchItem) => ({
          id: it.id,
          artistName: it.title || it.username || it.username,
          artistImage: it.imageUrl || this.placeholderArtist
        } as Artist));
        this._artistResultsRaw.set(artists);
      },
      error: () => {
        this._artistResultsRaw.set([]);
      }
    });

    // Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      songSub.unsubscribe();
      albumSub.unsubscribe();
      artistSub.unsubscribe();
    });

    this.#searchService.search({ query: 'crazy', tab: 'albums', page: 1, pageSize: 1 }).pipe(take(1))
      .subscribe(r => {
        const it = (r as any)?.items?.find((x: any) => x.type === 'album');
        console.log('search item sample', it);
        const mapped = this.normalizeAlbumFromApi({
          id: it?.id,
          albumName: it?.title,
          albumImageUrl: it?.coverArt,
          artistNames: it?.artistNames,
          releaseDate: it?.releaseDate
        });
        console.log('normalized sample', mapped);
      });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.autoResizeBio(), 0);
  }

  onLogout(): void {
    this.#apiService.logout?.();
    this.router.navigate(['/login']);
  }

  autoResizeBio(): void {
    const el = this.bioTextarea()?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  // -------------------------
  // Upload helpers and flows
  // -------------------------

  private requestSignedUrl(fileName: string, contentType: string, type: 'profile' | 'bg') {
    const url = `${this.apiBase}/v1/Bucket/signed-url`;
    const payload = { fileName, contentType, type };
    return this.#http.post<{ signedUrl?: string; filePath?: string }>(url, payload).pipe(
      take(1),
      catchError(err => {
        console.error('Failed to request signed URL', err);
        return of({ signedUrl: undefined, filePath: undefined });
      })
    );
  }

  private uploadToSignedUrlUsingFetch(signedUrl: string, file: File) {
    return from(fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    }).then(res => {
      if (!res.ok) throw new Error(`Upload failed with status ${res.status}`);
      return true;
    }));
  }

  onProfilePictureSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.profilePicFileName.set('');
      return;
    }

    const validType = /^image\/(png|jpe?g|webp)$/i.test(file.type);
    const validSize = file.size <= 3 * 1024 * 1024; // 3MB
    this.profilePicFileName.set(file.name); // show immediately

    if (!validType || !validSize) {
      input.value = '';
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    const prevBlob = this.localBlobUrl();
    if (prevBlob) URL.revokeObjectURL(prevBlob);
    this.localBlobUrl.set(blobUrl);
    this.profilePictureUrl.set(blobUrl);

    this.requestSignedUrl(file.name, file.type || 'application/octet-stream', 'profile').pipe(
      switchMap(res => {
        const signedUrl = res?.signedUrl;
        const filePath = res?.filePath;
        if (!signedUrl || !filePath) {
          throw new Error('Signed URL or filePath not returned by server');
        }
        return this.uploadToSignedUrlUsingFetch(signedUrl, file).pipe(map(uploadOk => ({ uploadOk, filePath })));
      }),
      switchMap(({ uploadOk, filePath }) => {
        if (!uploadOk) throw new Error('Upload to storage failed');
        return this.#profileService.confirmUpload(filePath, 'profile');
      }),
      take(1)
    ).subscribe({
      next: () => {
        this.#profileService.getProfile().pipe(take(1)).subscribe(p => {
          const pAny = p as any;
          const url = this.resolveImageUrl(
            pAny.profilePictureUrl ?? pAny.profileImageUrl ?? pAny.avatarUrl ?? pAny.picture ?? pAny.imageUrl ?? pAny.profilePicture
          );
          // cache-bust
          this.profilePictureUrl.set(`${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`);
        });
        this.persistFileName('profile', file.name); // persist after success
      },
      error: (err) => {
        console.error('Profile upload/confirm failed', err);
        this.#profileService.getProfile().pipe(take(1)).subscribe(p => {
          const pAny = p as any;
          const url = this.resolveImageUrl(
            pAny.profilePictureUrl ?? pAny.profileImageUrl ?? pAny.avatarUrl ?? pAny.picture ?? pAny.imageUrl ?? pAny.profilePicture
          );
          this.profilePictureUrl.set(url);
        });
        // optional: revert persisted name on error
      }
    });

    input.value = '';
  }

  onFileSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.selectedFileName.set(file.name);

    const validType = /^image\/(png|jpe?g|webp)$/i.test(file.type);
    const validSize = file.size <= 5 * 1024 * 1024; // 5MB
    if (!validType || !validSize) {
      return;
    }

    this.requestSignedUrl(file.name, file.type || 'application/octet-stream', 'bg').pipe(
      switchMap(res => {
        const signedUrl = res?.signedUrl;
        const filePath = res?.filePath;
        if (!signedUrl || !filePath) {
          throw new Error('Signed URL or filePath not returned by server');
        }
        return this.uploadToSignedUrlUsingFetch(signedUrl, file).pipe(map(uploadOk => ({ uploadOk, filePath })));
      }),
      switchMap(({ uploadOk, filePath }) => {
        if (!uploadOk) throw new Error('Upload to storage failed');
        return this.#profileService.confirmUpload(filePath, 'bg');
      }),
      take(1)
    ).subscribe({
      next: () => {
        this.#profileService.getProfile().pipe(take(1)).subscribe();
        this.persistFileName('bg', file.name); // persist background file name
      },
      error: (err) => {
        console.error('Background upload/confirm failed', err);
      }
    });
  }

  // -------------------------
  // Profile and favorites flows
  // -------------------------

  onBioSubmit(): void {
    if (this.bioForm.invalid) return;
    const bio = this.bioForm.value.bio ?? '';
    this.#profileService.updateBio(bio).pipe(take(1)).subscribe({
      next: () => this.bioForm.markAsPristine(),
      error: (err) => console.error('Failed to update bio', err)
    });
  }

  selectSong(song: Song): void {
    const prev = this.favoriteSong();
    this.favoriteSong.set(song);
    this.#profileService.updateFavoriteSong(song.id).pipe(take(1)).subscribe({
      next: () => { /* success */ },
      error: () => this.favoriteSong.set(prev)
    });
  }

  clearFavoriteSong(): void {
    const prev = this.favoriteSong();
    this.favoriteSong.set(null);
    this.#profileService.updateFavoriteSong(null).pipe(take(1)).subscribe({
      next: () => { /* cleared */ },
      error: () => this.favoriteSong.set(prev)
    });
  }

  addArtistToFavorites(artist: Artist): void {
    if (this.favoriteArtists().some(a => a.id === artist.id)) return;
    const updated = [artist, ...this.favoriteArtists().filter(a => a.id !== artist.id)];
    this.favoriteArtists.set(updated);
    this.artistSearchForm.controls.query.setValue('');
    this._artistResultsRaw.set([]);

    const ranked = updated.slice(0, 10).map((a, idx) => ({ artistId: a.id, rank: idx + 1 }));
    this.#profileService.updateFavoriteArtistRanks(ranked).pipe(take(1)).subscribe({
      error: () => this.#profileService.getFavoriteArtists().pipe(take(1)).subscribe(a => this.favoriteArtists.set(a ?? []))
    });
  }

  removeArtistFromFavorites(artist: Artist): void {
    const updated = this.favoriteArtists().filter(a => a.id !== artist.id);
    this.favoriteArtists.set(updated);
    const ranked = updated.slice(0, 10).map((a, idx) => ({ artistId: a.id, rank: idx + 1 }));
    this.#profileService.updateFavoriteArtistRanks(ranked).pipe(take(1)).subscribe({
      error: () => this.#profileService.getFavoriteArtists().pipe(take(1)).subscribe(a => this.favoriteArtists.set(a ?? []))
    });
  }

  addAlbumToFavorites(album: Album): void {
    const updated = [album, ...this.favoriteAlbums().filter(a => a.id !== album.id)];
    this.favoriteAlbums.set(updated);
    this.unheartedAlbumIds.update(prev => {
      const next = new Set(prev);
      next.delete(album.id);
      return next;
    });

    this.#profileService.addFavoriteAlbum(album.id).pipe(take(1)).subscribe({
      error: () => this.favoriteAlbums.set(this.favoriteAlbums().filter(a => a.id !== album.id))
    });
  }

  removeAlbumFromFavorites(album: Album): void {
    this.unheartedAlbumIds.update(prev => {
      const next = new Set(prev);
      next.add(album.id);
      return next;
    });

    this.#profileService.removeFavoriteAlbum(album.id).pipe(take(1)).subscribe({
      next: () => {
        const serverUpdated = this.favoriteAlbums().filter(a => a.id !== album.id);
        this.favoriteAlbums.set(serverUpdated);
      },
      error: () => {
        this.unheartedAlbumIds.update(prev => {
          const next = new Set(prev);
          next.delete(album.id);
          return next;
        });
      }
    });

    const q = (this.albumSearchForm.controls.query.value ?? '').toString().trim();
    if (q) {
      this.#searchService.search({ query: q, tab: 'albums', page: 1, pageSize: 20 }).pipe(take(1)).subscribe(res => {
        const results: any[] =
          Array.isArray(res?.items) ? res.items.filter((it: SearchItem) => it.type === 'album') :
          [];

        const albums = results.map((it: any) => this.normalizeAlbumFromApi({
          id: it.id ?? it.albumId,
          albumName: it.title ?? it.albumName ?? it.name,
          albumImageUrl: it.imageUrl ?? it.albumImageUrl ?? it.coverArt ?? it.albumCover,
          // Use artistNames from the album search endpoint
          artistNames: typeof it.artistNames === 'string' ? it.artistNames : '',
          releaseDate: it.releaseYear ?? it.year ?? it.releaseDate ?? it.dateLabel
        }));
        this._albumResultsRaw.set(albums);
      });
    }
  }

  // Getter for template
  get topTenFavoriteArtistsListArr(): Artist[] {
    return this.favoriteArtists().slice(0, 10);
  }

  // trackBy helpers
  trackByArtist(index: number, artist: Artist | null) {
    return artist?.id ?? index;
  }
  trackByAlbum(index: number, album: Album | null) {
    return album?.id ?? index;
  }
  trackBySong(index: number, song: Song | null) {
    return song?.id ?? index;
  }

  dropFavoriteArtist(event: CdkDragDrop<Artist[]>) {
    const current = this.favoriteArtists();
    const top = [...current.slice(0, 10)];
    moveItemInArray(top, event.previousIndex, event.currentIndex);
    const updated = [...top, ...current.slice(10)];
    this.favoriteArtists.set(updated);

    const ranked = updated.slice(0, 10).map((a, idx) => ({ artistId: a.id, rank: idx + 1 }));
    this.#profileService.updateFavoriteArtistRanks(ranked).pipe(take(1)).subscribe({
      error: () => this.#profileService.getFavoriteArtists().pipe(take(1)).subscribe(a => this.favoriteArtists.set(a ?? []))
    });
  }

  ngOnDestroy() {
    const prev = this.localBlobUrl();
    if (prev) URL.revokeObjectURL(prev);
  }

  // Hide results when search inputs lose focus
  onAlbumSearchBlur(): void {
    setTimeout(() => {
      this._albumResultsRaw.set([]);
      this.loadingAlbumSearch.set(false);
    }, 150);
  }

  onArtistSearchBlur(): void {
    setTimeout(() => {
      this._artistResultsRaw.set([]);
    }, 150);
  }
}


