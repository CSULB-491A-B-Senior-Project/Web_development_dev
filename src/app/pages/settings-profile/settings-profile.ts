import { ChangeDetectionStrategy, Component, ElementRef, AfterViewInit, inject, signal, viewChild, computed, DestroyRef } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, tap, catchError, map, finalize } from 'rxjs/operators';
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
import { SidebarComponent } from '../../ui/sidebar/sidebar';
import { ProfilePictureStore } from '../../ui/navbar/profile-picture.store';

@Component({
  selector: 'app-settings-profile',
  templateUrl: './settings-profile.html',
  styleUrl: './settings-profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgOptimizedImage,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    SidebarComponent
  ],
})
export class SettingsProfile implements AfterViewInit {
  #nfb = inject(NonNullableFormBuilder);
  #profileService = inject(ProfileService);
  #searchService = inject(SearchService);
  #musicSearchService = inject(MusicSearchService);
  #artistService = inject(ArtistService);
  #albumReviews = inject(AlbumReviewsService);
  #http = inject(HttpClient);
  #apiService = inject(ApiService);

  private apiBase = (environment.apiBaseUrl ?? '').replace(/\/$/, '');

  readonly placeholderArtist = '/assets/default-profile.png';
  readonly placeholderAlbum = '/assets/placeholder.png';

  profilePictureUrl = signal<string>('/assets/default-profile.png');
  profilePicFileName = signal<string>('');
  private localBlobUrl = signal<string | null>(null);

  selectedFileName = signal('');
  favoriteArtists = signal<Artist[]>([]);
  favoriteAlbums = signal<Album[]>([]);
  favoriteSong = signal<Song | null>(null);
  artistRanks = signal<{ artistId: string; rank: number }[]>([]);

  unheartedAlbumIds = signal<Set<string>>(new Set());
  backgroundImageUrl = signal<string | null>(null);

  isAlbumUnhearted(album: Album): boolean {
    return this.unheartedAlbumIds().has(album.id);
  }

  private resolveImageUrl(raw?: unknown): string {
    const placeholder = '/assets/default-profile.png';
    const v = (raw ?? '').toString().trim();
    if (!v) return placeholder;
    if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('blob:') || v.startsWith('data:')) return v;
    const base = this.apiBase || window.location.origin;
    if (v.startsWith('/')) return `${base}${v}`;
    return `${base}/${v}`;
  }

  private deriveFileNameFromUrl(url: string | null | undefined): string {
    if (!url) return '';
    try {
      const u = new URL(url, window.location.origin);
      const last = u.pathname.split('/').filter(Boolean).pop() || '';
      return decodeURIComponent(last);
    } catch {
      const clean = (url || '').split(/[?#]/)[0];
      const last = clean.split('/').filter(Boolean).pop() || '';
      try { return decodeURIComponent(last); } catch { return last; }
    }
  }

  private extractBackgroundUrl(p: Record<string, unknown> | null | undefined): string | null {
    const src = p ?? {};
    const raw =
      src['backgroundImageUrl'] ??
      src['backgroundUrl'] ??
      src['bannerImageUrl'] ??
      src['bannerUrl'] ??
      src['coverImageUrl'] ??
      src['background'] ??
      src['bgImageUrl'] ??
      src['bgImage'] ??
      '';
    const v = (raw ?? '').toString().trim();
    return v ? this.resolveImageUrl(v) : null;
  }

  private normalizeAlbumFromApi(a: unknown): Album {
    const src = a as Record<string, unknown>;
    const id = (src['albumId'] as string) ?? (src['id'] as string) ?? '';
    const name = (src['albumName'] as string) ?? (src['title'] as string) ?? (src['name'] as string) ?? '';

    const artistName =
      (typeof src['artistName'] === 'string' ? (src['artistName'] as string) : undefined) ??
      (typeof src['username'] === 'string' ? (src['username'] as string) : undefined) ??
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

  private normalizeTrackFromApi(raw: any): Song {
  return {
    id: raw.id,
    name: raw.name,
    artistName: raw.artistName ?? raw.artistNames ?? 'Unknown Artist',
    albumCoverUrl: raw.albumCoverUrl ?? raw.albumCover ?? this.placeholderAlbum,
    durationMs: typeof raw.duration === 'number' ? raw.duration * 1000 : undefined,
    trackNumber: raw.trackNumber,
    previewUrl: raw.previewUrl,
    raw
  };
}

  private msToMinSec(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

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

  trackSearchForm = this.#nfb.group({ query: '' as string });
  trackSearchQuery = signal('');
  private _trackResultsRaw = signal<Song[]>([]);
  trackResults = computed(() => this._trackResultsRaw());

  songSearchQuery = signal('');
  artistSearchQuery = signal('');
  albumSearchQuery = signal('');

  bioForm = this.#nfb.group({
    bio: ['', [Validators.maxLength(150)]]
  });
  songSearchForm = this.#nfb.group({ query: '' });
  artistSearchForm = this.#nfb.group({ query: '' });
  albumSearchForm = this.#nfb.group({ query: '' });

  bioTextarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('bioTextarea');

  loadingSongSearch = signal(false);
  loadingAlbumSearch = signal(false);
  songSearchError = signal<string | null>(null);
  albumSearchError = signal<string | null>(null);

  private destroyRef = inject(DestroyRef);

  private toYear(raw: unknown): number | undefined {
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
      const s = raw.trim();
      const m = s.match(/\b(19|20)\d{2}\b/);
      if (m) return Number.parseInt(m[0], 10);

      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) return d.getUTCFullYear();
      const n = Number.parseInt(s, 10);
      return Number.isNaN(n) ? undefined : n;
    }
    if (raw instanceof Date) return raw.getUTCFullYear();
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

  constructor(private router: Router, private pictureStore: ProfilePictureStore) {
    // Load profile
    this.#profileService.getProfile().pipe(take(1)).subscribe({
      next: (p: any) => {
        this.currentUserKey = String(p?.id ?? p?.userId ?? p?.username ?? 'me');
        const bio = p.bio ?? '';
        this.bioForm.patchValue({ bio }, { emitEvent: false });
        this.bioForm.markAsPristine();

        const url = this.resolveImageUrl(
          p.profilePictureUrl ?? p.profileImageUrl ?? p.avatarUrl ?? p.picture ?? p.imageUrl ?? p.profilePicture
        );
        this.profilePictureUrl.set(url);
        this.profilePicFileName.set(this.deriveFileNameFromUrl(url));
        this.pictureStore.profilePictureUrl.set(url);

        const bgUrl = this.extractBackgroundUrl(p);
        this.backgroundImageUrl.set(bgUrl);
        this.selectedFileName.set(this.deriveFileNameFromUrl(bgUrl));

        this.favoriteSong.set(p.favoriteSong ?? null);

        const artists = (p.favoriteArtists ?? []).map((a: any) => ({
          id: a.id,
          artistName: a.artistName ?? a.name ?? '',
          artistImage: a.artistImage ?? a.imageUrl ?? this.placeholderArtist
        } as Artist));
        this.favoriteArtists.set(artists);

        const albums = (p.favoriteAlbums ?? []).map((al: any) => this.normalizeAlbumFromApi(al));
        this.favoriteAlbums.set(albums);
      },
      error: (err) => console.error('Failed to load profile', err)
    });

    this.#profileService.getFavoriteArtists().pipe(take(1)).subscribe({
      next: (artists) => {
        if (artists && artists.length) {
          this.favoriteArtists.set(artists.map(a => ({
            id: a.id,
            artistName: a.artistName ?? '',
            artistImage: a.artistImage ?? this.placeholderArtist
          } as Artist)));
        }
      },
      error: (err) => console.error('Failed to load favorite artists', err)
    });

    this.#profileService.getFavoriteAlbums().pipe(take(1)).subscribe({
      next: (albums) => {
        if (albums && albums.length) {
          const normalized = (albums as unknown[]).map(a => this.normalizeAlbumFromApi(a));
          this.favoriteAlbums.set(normalized);
          this.enrichFavoriteAlbumsViaDetails(normalized);
        }
      },
      error: (err) => console.error('Failed to load favorite albums', err)
    });

    // ------------------------------
// FAVORITE SONG SEARCH
// ------------------------------
const songSub = this.songSearchForm.controls.query.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),

  tap(raw => {
  if (typeof raw === 'string') {
    this.songSearchQuery.set(raw.trim());
  }
}),

  switchMap(raw => {
    const term = (raw ?? '').toString().trim();
    if (!term) {
      this.songResults.set([]); // clear list
      return of<Song[]>([]);
    }

    // ⭐ This MUST call MusicSearchService
    return this.#musicSearchService.searchSongs(term).pipe(
      take(1),
      catchError(err => {
        console.error("Favorite Song Search Failed:", err);
        this.songSearchError.set("Search failed");
        return of<Song[]>([]);
      })
    );
  })
).subscribe({
  next: songs => {
    // ⭐⭐ THIS IS THE LINE THAT MAKES THE UI ACTUALLY UPDATE ⭐⭐
    // this.songResults.set(songs);

    // this.loadingSongSearch.set(false);
   
    const normalized = songs.map(s => this.normalizeTrackFromApi(s));
    this.songResults.set(normalized);
    this.loadingSongSearch.set(false);
    console.log("QUERY:", this.songSearchQuery());
    console.log("RESULTS:", this.songResults());
    console.log("VISIBLE:", this.songSearchQuery() && this.songResults().length > 0);
    console.log("WHAT SETTINGS-PROFILE RECEIVED:", songs, Array.isArray(songs));

  },
  error: err => {
    console.error("Unhandled Favorite Song Search error:", err);
    this.loadingSongSearch.set(false);
  }
});

    // ALBUM SEARCH, ARTIST SEARCH, TRACK SEARCH
    const albumSub = this.albumSearchForm.controls.query.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(v => { this.albumSearchQuery.set(v ?? ''); this.loadingAlbumSearch.set(!!(v ?? '').toString().trim()); this.albumSearchError.set(null); }),
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
            artistName: it.username,
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

    const artistSub = this.artistSearchForm.controls.query.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(v => { this.artistSearchQuery.set(v ?? ''); }),
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
          artistName: it.title || it.username,
          artistImage: it.imageUrl || this.placeholderArtist
        } as Artist));
        this._artistResultsRaw.set(artists);
      },
      error: () => {
        this._artistResultsRaw.set([]);
      }
    });

    const trackSub = this.trackSearchForm.controls.query.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),

  tap(raw => {
    this.trackSearchQuery.set((raw ?? '').toString().trim());
  }),

  switchMap(raw => {
    const term = (raw ?? '').toString().trim();
    if (!term) return of<Song[]>([]);

    // ⭐ THE FIX — call the RIGHT service
    return this.#musicSearchService.searchSongs(term);
  })
).subscribe({
  next: songs => this._trackResultsRaw.set(songs),
  error: err => console.error("Track search error:", err)
});


      this.destroyRef.onDestroy(() => {
        songSub.unsubscribe();
        albumSub.unsubscribe();
        artistSub.unsubscribe();
        trackSub.unsubscribe();
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
    const validSize = file.size <= 3 * 1024 * 1024;
    this.profilePicFileName.set(file.name);

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
          const busted = `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
          this.profilePictureUrl.set(busted);
          this.profilePicFileName.set(this.deriveFileNameFromUrl(url));
          this.pictureStore.profilePictureUrl.set(busted);
        });
      },
      error: (err) => {
        console.error('Profile upload/confirm failed', err);
        this.#profileService.getProfile().pipe(take(1)).subscribe(p => {
          const pAny = p as any;
          const url = this.resolveImageUrl(
            pAny.profilePictureUrl ?? pAny.profileImageUrl ?? pAny.avatarUrl ?? pAny.picture ?? pAny.imageUrl ?? pAny.profilePicture
          );
          this.profilePictureUrl.set(url);
          this.profilePicFileName.set(this.deriveFileNameFromUrl(url));
          this.pictureStore.profilePictureUrl.set(url);
        });
      }
    });

    input.value = '';
  }

  onFileSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.selectedFileName.set(file.name);

    const validType = /^image\/(png|jpe?g|webp)$/i.test(file.type);
    const validSize = file.size <= 5 * 1024 * 1024;
    if (!validType || !validSize) return;

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
        this.#profileService.getProfile().pipe(take(1)).subscribe(p => {
          const bgUrl = this.extractBackgroundUrl(p as any);
          this.backgroundImageUrl.set(bgUrl);
          this.selectedFileName.set(this.deriveFileNameFromUrl(bgUrl));
        });
      },
      error: (err) => console.error('Background upload failed', err)
    });
  }

  viewBackground(): void {
    const url = this.backgroundImageUrl();
    if (!url) return;
    window.open(url, '_blank');
  }

  onBioSubmit(): void {
    if (this.bioForm.invalid) return;
    const bio = this.bioForm.value.bio ?? '';
    this.#profileService.updateBio(bio).pipe(take(1)).subscribe({
      next: () => this.bioForm.markAsPristine(),
      error: (err) => console.error('Failed to update bio', err)
    });
  }

  onSearchListClick(e: MouseEvent): void {
    console.log('[SettingsProfile] list clicked', e.target);
  }

  selectSong(song: Song): void {
    // if (!song?.id) return;

    const prev = this.favoriteSong();

    this.#profileService.updateFavoriteSong(song.id).pipe(take(1)).subscribe({
      next: () => {
        this.favoriteSong.set(song); // normalized already
        this.songSearchForm.controls.query.setValue('');
        this.songResults.set([]);
      },
      error: () => this.favoriteSong.set(prev)
    });
  }


  // Keep track selection consistent (delegates to selectSong)
  selectTrack(t: Song): void {
    if (!t?.id) return;
    this.selectSong(t);
  }

  clearFavoriteSong(): void {
    const prev = this.favoriteSong();
    this.favoriteSong.set(null);

    // Send null to clear (only id/null is needed)
    this.#profileService.updateFavoriteSong(null).pipe(take(1)).subscribe({
      next: () => {},
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
  }

  get topTenFavoriteArtistsListArr(): Artist[] {
    return this.favoriteArtists().slice(0, 10);
  }

  trackByArtist(index: number, artist: Artist | null) {
    return artist?.id ?? index;
  }
  trackByAlbum(index: number, album: Album | null) {
    return album?.id ?? index;
  }
  trackBySong(index: number, song: Song | null) {
    return song?.id ?? index;
  }
  trackByTrack(index: number, track: Song | { id?: string } | null) {
    return track?.id ?? index;
  }

  dropFavoriteArtist(event: CdkDragDrop<Artist[]>) {
    const current = this.favoriteArtists();
    const top = [...current.slice(0, 10)];
    moveItemInArray(top, event.previousIndex, event.currentIndex);
    const updated = [...top, ...current.slice(10)];
    this.favoriteArtists.set(updated);

    const ranked = updated.slice(0, 10).map((a, idx) => ({ artistId: a.id, rank: idx + 1 }));
    this.artistRanks.set(ranked);
    this.#profileService.updateFavoriteArtistRanks(ranked).pipe(take(1)).subscribe({
      error: () => this.#profileService.getFavoriteArtists().pipe(take(1)).subscribe(a => this.favoriteArtists.set(a ?? []))
    });
  }

  // selectTrack(t: Song): void {
  //   if (!t?.id) return;

  //   const prev = this.favoriteSong();
  //   this.favoriteSong.set(t);

  //   this.#profileService.updateFavoriteSong(t.id).pipe(take(1)).subscribe({
  //     next: () => {},
  //     error: () => this.favoriteSong.set(prev)
  //   });

  //   this.trackSearchForm.controls.query.setValue('');
  //   this._trackResultsRaw.set([]);
  // }

  getArtistRank(artistId: string, fallback: number): number {
    const rank = this.artistRanks().find(r => r.artistId === artistId)?.rank;
    return rank ?? fallback;
  }

  ngOnDestroy() {
    const prev = this.localBlobUrl();
    if (prev) URL.revokeObjectURL(prev);
  }
}
